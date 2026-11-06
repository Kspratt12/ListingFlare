import { assertNoNetworkAttempts } from "./_isolation";
import test from "node:test";
import assert from "node:assert/strict";
import { openAccountChannels, type CloseOutcome } from "../accountChannels";
import { createSessionManager } from "../sessionState";

// The REAL channel binding (accountChannels.ts) and session manager, with fake channels and fictional users. The realtime
// client and the LiveLeadAlerts component are not run here (the mounted tests do run the component). `Driver` stands in for
// the dashboard layout, which remounts LiveLeadAlerts (key) when the account changes.
//
// What "closed" means in these tests: removal was REQUESTED. A fake client cannot show that a real server dropped the
// subscription, and nothing here claims it.

const A = "fictional-user-A";
const B = "fictional-user-B";

interface FakeChannel { id: string; userId: string; closed: number; emit: (payload: string) => void }

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

const defaultFirst = () => Promise.resolve<string | null>(A);

function setup(first: () => Promise<string | null> = defaultFirst, close: (c: FakeChannel) => PromiseLike<unknown> | void = () => {}) {
  let onEvent: (e: string, u: string | null) => void = () => {};
  // the fake session source: by default it reports whoever `setSession` last named (the real one reads the browser session)
  let session: string | null = A;
  const read = first === defaultFirst ? () => Promise.resolve(session) : first;
  const m = createSessionManager({ readSession: read, watchAuth: (cb) => { onEvent = cb; }, onUserChanged: () => {} });
  const log = { opened: [] as FakeChannel[], handled: [] as string[], closedIds: [] as string[], outcomes: [] as CloseOutcome[] };
  // how the component uses the helper: 3 channels per account, each callback guarded by isCurrent()
  const start = () =>
    openAccountChannels<FakeChannel>({
      getUserId: () => m.getUserId(),
      getGeneration: m.getGeneration,
      open: (userId, isCurrent) => {
        const make = (name: string): FakeChannel => {
          const ch: FakeChannel = { id: `${name}:${userId}`, userId, closed: 0, emit: (payload) => { if (!isCurrent()) return; log.handled.push(`${ch.id}:${payload}`); } };
          log.opened.push(ch);
          return ch;
        };
        return [make("leads"), make("showings"), make("messages")];
      },
      close: (c) => { c.closed++; log.closedIds.push(c.id); return close(c); },
      onCloseOutcome: (o) => log.outcomes.push(o),
    });
  // The layout's remount on an account change: the layout keys its children by the snapshot's GENERATION, so only a
  // generation change (not the first identity, not a same-user event) stops the old binding and starts a new one.
  class Driver {
    binding = start();
    private generation = m.getGeneration();
    constructor() {
      m.subscribe(() => {
        if (m.getGeneration() === this.generation) return;
        this.generation = m.getGeneration();
        this.binding.stop();
        this.binding = start();
      });
    }
  }
  return { m, log, setSession: (u: string | null) => { session = u; }, emit: (e: string, u: string | null) => onEvent(e, u), Driver, start };
}

const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test("channels are opened only after the account is established, three per account", async () => {
  const lookup = deferred<string | null>();
  const s = setup(() => lookup.promise);
  s.start();
  await tick();
  assert.equal(s.log.opened.length, 0, "nothing is opened while the user lookup is running");
  lookup.resolve(A);
  await tick();
  assert.deepEqual(s.log.opened.map((c) => c.id), ["leads:" + A, "showings:" + A, "messages:" + A]);
});

test("no session: no channels are opened", async () => {
  const s = setup(() => Promise.resolve(null));
  s.start();
  await tick();
  assert.equal(s.log.opened.length, 0);
});

test("stopping while the user lookup is still running means nothing is ever opened (no leaked channels)", async () => {
  const lookup = deferred<string | null>();
  const s = setup(() => lookup.promise);
  const b = s.start();
  b.stop();
  lookup.resolve(A);
  await tick();
  assert.equal(s.log.opened.length, 0);
});

test("an account change while the lookup is running means nothing is opened for the old account", async () => {
  const lookup = deferred<string | null>();
  const s = setup(() => lookup.promise);
  s.start();
  s.emit("SIGNED_IN", B);          // B signs in; the lookup (which read A) is still running
  lookup.resolve(A);
  await tick();
  assert.equal(s.log.opened.length, 0, "the stale lookup must not open A's channels");
});

test("A to B: A's callbacks are ignored from the moment of the change, A's channels get a removal request once, B's are opened after B is established", async () => {
  const s = setup();
  new s.Driver();
  await tick();
  const aChannels = [...s.log.opened];
  assert.equal(aChannels.length, 3);
  aChannels[0].emit("A-lead-before-change");
  assert.deepEqual(s.log.handled, [`leads:${A}:A-lead-before-change`]);

  s.setSession(B);
  s.emit("SIGNED_IN", B);          // account change: generation moves, the driver stops A's binding and starts B's
  aChannels[1].emit("A-showing-after-change");
  assert.equal(s.log.handled.length, 1, "ignored");
  await tick();
  assert.deepEqual(s.log.closedIds, aChannels.map((c) => c.id), "each of A's channels was asked to close exactly once");
  const bChannels = s.log.opened.slice(3);
  assert.deepEqual(bChannels.map((c) => c.id), ["leads:" + B, "showings:" + B, "messages:" + B]);
  aChannels[2].emit("A-message-after-teardown");
  bChannels[0].emit("B-lead-1");
  assert.deepEqual(s.log.handled, [`leads:${A}:A-lead-before-change`, `leads:${B}:B-lead-1`]);
});

test("sign-out asks A's channels to close and opens nothing", async () => {
  const s = setup();
  new s.Driver();
  await tick();
  const a = [...s.log.opened];
  s.setSession(null);              // the browser session is gone
  s.emit("SIGNED_OUT", null);
  await tick();
  assert.ok(a.every((c) => c.closed === 1));
  assert.equal(s.log.opened.length, 3, "no new channels for a signed-out session");
});

test("same-user auth events do not reopen anything: one set of channels, no subscription loop", async () => {
  const s = setup();
  new s.Driver();
  await tick();
  for (let i = 0; i < 300; i++) s.emit(i % 2 ? "TOKEN_REFRESHED" : "SIGNED_IN", A);
  await tick();
  assert.equal(s.log.opened.length, 3, "still the original three");
  assert.deepEqual(s.log.closedIds, []);
  s.log.opened[0].emit("A-lead-2");
  assert.equal(s.log.handled.length, 1, "and events are still delivered");
});

test("stop() is idempotent and a callback after stop() is ignored", async () => {
  const s = setup();
  const b = s.start();
  await tick();
  const ch = [...s.log.opened];
  b.stop();
  b.stop();
  assert.ok(ch.every((c) => c.closed === 1));
  ch[0].emit("late");
  assert.deepEqual(s.log.handled, []);
});

// ---- removal outcomes ----

async function stopWith(close: (c: FakeChannel) => PromiseLike<unknown> | void) {
  const unhandled: unknown[] = [];
  const onUnhandled = (r: unknown) => { unhandled.push(r); };
  process.on("unhandledRejection", onUnhandled);
  try {
    const s = setup(defaultFirst, close);
    const b = s.start();
    await tick();
    const ch = [...s.log.opened];
    b.stop();
    await new Promise((r) => setTimeout(r, 10));
    ch[0].emit("late-after-failure");
    return { s, ch, unhandled };
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
}

test("removal result 'ok' is reported as ok, and nothing is retried", async () => {
  const r = await stopWith(() => Promise.resolve("ok"));
  assert.deepEqual(r.s.log.outcomes, ["ok", "ok", "ok"]);
  assert.ok(r.ch.every((c) => c.closed === 1), "one request per channel, no retry");
});

test("removal results 'timed out' / 'error' / nothing are reported as unconfirmed, not as success; late events stay suppressed locally", async () => {
  for (const status of ["timed out", "error", undefined]) {
    const r = await stopWith(() => Promise.resolve(status));
    assert.deepEqual(r.s.log.outcomes, ["unconfirmed", "unconfirmed", "unconfirmed"], String(status));
    assert.deepEqual(r.s.log.handled, [], "the local stopped/generation guard does not depend on the removal outcome");
    assert.ok(r.ch.every((c) => c.closed === 1), "no retry");
  }
});

test("a REJECTED removal and a THROWING removal are handled: reported as failed, no unhandled rejection, no retry", async () => {
  const rejected = await stopWith(() => Promise.reject(new Error("realtime socket closed")));
  assert.deepEqual(rejected.s.log.outcomes, ["failed", "failed", "failed"]);
  assert.equal(rejected.unhandled.length, 0);
  assert.deepEqual(rejected.s.log.handled, []);
  const thrown = await stopWith(() => { throw new Error("client exploded"); });
  assert.deepEqual(thrown.s.log.outcomes, ["failed", "failed", "failed"]);
  assert.equal(thrown.unhandled.length, 0);
  assert.ok(thrown.ch.every((c) => c.closed === 1));
});

test("a removal that never settles blocks nothing: the next binding opens immediately", async () => {
  const s = setup(defaultFirst, () => new Promise(() => {}));
  new s.Driver();
  await tick();
  s.setSession(B);
  s.emit("SIGNED_IN", B);
  await tick();
  assert.equal(s.log.opened.slice(3).length, 3, "B's channels are open although A's removal never answered");
  assert.deepEqual(s.log.outcomes, [], "and no outcome was claimed");
});

test("a failing diagnostics hook cannot break cleanup", async () => {
  const b = openAccountChannels<{ id: number }>({
    getUserId: () => Promise.resolve(A),
    getGeneration: () => 0,
    open: () => [{ id: 1 }, { id: 2 }],
    close: () => Promise.resolve("ok"),
    onCloseOutcome: () => { throw new Error("hook failed"); },
  });
  await tick();
  assert.doesNotThrow(() => b.stop());
  await tick();
});

test("no test above reached the network", () => {
  assertNoNetworkAttempts();
});
