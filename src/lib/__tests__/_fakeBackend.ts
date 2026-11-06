// A FAKE account service and database for mounted-component tests. Fictional data only; no network, no real Supabase.
//
// It mimics only the parts of the Supabase browser client the dashboard layout, listings page, live alerts and command
// palette call: auth (getSession, onAuthStateChange, signOut), table queries (chainable and awaitable), realtime channels
// and removeChannel. Every call is recorded, and any query can be held and released by the test.

export interface FakeSession { user: { id: string } }
export interface FakeQuery {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  filters: Record<string, unknown>;
  select?: unknown;
  opts?: { count?: string; head?: boolean };
  row?: Record<string, unknown>;
  single: boolean;
}
export interface FakeChannel {
  id: number;
  name: string;
  subscribed: boolean;
  removed: boolean;
  handlers: { filter: Record<string, unknown>; cb: (payload: { new: Record<string, unknown> }) => void }[];
  on: (type: string, filter: Record<string, unknown>, cb: (payload: { new: Record<string, unknown> }) => void) => FakeChannel;
  subscribe: () => FakeChannel;
}
export type QueryResult = { data: unknown; error: unknown; count?: number | null };

export function createFakeBackend(firstUser: string | null) {
  let session: FakeSession | null = firstUser ? { user: { id: firstUser } } : null;
  const authCallbacks: ((event: string, session: FakeSession | null) => void)[] = [];
  const queries: FakeQuery[] = [];
  const channels: FakeChannel[] = [];
  const removed: FakeChannel[] = [];
  const handlers: Record<string, (q: FakeQuery) => PromiseLike<QueryResult> | QueryResult> = {};
  let removeChannelImpl: (c: FakeChannel) => Promise<string> = () => Promise.resolve("ok");
  let sessionReads = 0;
  let sessionHold: { release: (s: FakeSession | null) => void; read: FakeSession | null }[] | null = null;

  function builder(table: string) {
    const q: FakeQuery = { table, op: "select", filters: {}, single: false };
    const b: unknown = new Proxy({}, {
      get(_t, key: string) {
        if (key === "then") {
          return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
            queries.push(q);
            const h = handlers[table];
            return Promise.resolve(h ? h(q) : { data: [], error: null, count: 0 }).then(res, rej);
          };
        }
        return (...args: unknown[]) => {
          if (key === "select") { q.select = args[0]; q.opts = args[1] as FakeQuery["opts"]; }
          else if (key === "eq") q.filters[args[0] as string] = args[1];
          else if (key === "insert") { q.op = "insert"; q.row = args[0] as Record<string, unknown>; }
          else if (key === "update") { q.op = "update"; q.row = args[0] as Record<string, unknown>; }
          else if (key === "delete") q.op = "delete";
          else if (key === "single" || key === "maybeSingle") q.single = true;
          return b;
        };
      },
    });
    return b;
  }

  const client = {
    auth: {
      getSession: () => {
        sessionReads++;
        const read = session; // what a lookup that starts now sees
        if (!sessionHold) return Promise.resolve({ data: { session: read } });
        const hold = sessionHold;
        return new Promise<{ data: { session: FakeSession | null } }>((res) => { hold.push({ read, release: () => res({ data: { session: read } }) }); });
      },
      onAuthStateChange: (cb: (event: string, s: FakeSession | null) => void) => {
        authCallbacks.push(cb);
        return { data: { subscription: { unsubscribe: () => { const i = authCallbacks.indexOf(cb); if (i >= 0) authCallbacks.splice(i, 1); } } } };
      },
      signOut: () => { backend.emitAuth("SIGNED_OUT", null); return Promise.resolve({ error: null }); },
    },
    from: (table: string) => builder(table),
    channel: (name: string): FakeChannel => {
      const ch: FakeChannel = {
        id: channels.length, name, subscribed: false, removed: false, handlers: [],
        on(_type, filter, cb) { ch.handlers.push({ filter, cb }); return ch; },
        subscribe() { ch.subscribed = true; return ch; },
      };
      channels.push(ch);
      return ch;
    },
    removeChannel: (ch: FakeChannel) => { ch.removed = true; removed.push(ch); return removeChannelImpl(ch); },
  };

  const backend = {
    client,
    queries,
    channels,
    removed,
    handlers,
    get sessionReads() { return sessionReads; },
    session: () => session,
    // The auth service changes the session first, then tells every listener (as the real client does).
    emitAuth(event: string, userId: string | null) {
      session = userId ? { user: { id: userId } } : null;
      [...authCallbacks].forEach((cb) => cb(event, session));
    },
    setRemoveChannel(fn: (c: FakeChannel) => Promise<string>) { removeChannelImpl = fn; },
    // Session lookups made after this call wait until released; each resolves with the session as it was when the lookup began.
    holdSessionReads() { sessionHold = []; return sessionHold; },
    // Changes the stored session WITHOUT telling any auth listener (to build a lookup that reads one account while another signs in).
    setSessionQuiet(userId: string | null) { session = userId ? { user: { id: userId } } : null; },
    activeChannels: () => channels.filter((c) => !c.removed),
    // A table handler that holds every request until the test releases it.
    hold(table: string) {
      const pending: { query: FakeQuery; release: (r: QueryResult) => void }[] = [];
      handlers[table] = (query) => new Promise<QueryResult>((release) => { pending.push({ query, release }); });
      return pending;
    },
  };
  return backend;
}
export type FakeBackend = ReturnType<typeof createFakeBackend>;
