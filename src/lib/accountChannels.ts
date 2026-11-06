// Owns the realtime channels for ONE signed-in account, so they cannot outlive it or leak into the next one.
//
//  - Channels are opened only after the account is established (never for "no session").
//  - If stop() is called, or the account changes, while the user lookup is still running, nothing is opened at all.
//  - stop() asks for every opened channel to be closed. It never waits for the answer and never retries.
//  - `isCurrent()` is handed to the channel callbacks: once the account has changed or the binding has been stopped it
//    returns false, so a late event from the old account's channel is ignored. That LOCAL guard does not depend on how
//    the removal turned out.
//
// What a removal outcome does and does not mean:
//  - "ok"          the realtime client reported the channel as removed.
//  - "unconfirmed" the client resolved with another status ("timed out", "error") or with nothing: the removal was
//                  requested, but nothing here shows the server has dropped the subscription.
//  - "failed"      the removal call threw or its promise rejected.
//  A report of "ok" is the client's own statement; this file cannot establish a server-side unsubscribe, and tests that
//  use a fake client cannot either. Outcomes are only reported to the optional `onCloseOutcome` hook (never logged, and
//  never containing a payload), and a rejected removal is handled so it cannot become an unhandled rejection.
//
// The caller starts a NEW binding when the account changes (the dashboard layout remounts the component then); same-user
// auth events change nothing, so they never restart it.

export type CloseOutcome = "ok" | "unconfirmed" | "failed";

export interface AccountChannelsDeps<C> {
  getUserId: () => Promise<string | null>;
  getGeneration: () => number;
  // Creates and subscribes the channels for this user. Handlers must check isCurrent() before acting.
  open: (userId: string, isCurrent: () => boolean) => C[];
  // Requests removal. May return the client's removal promise (a status string) or nothing.
  close: (channel: C) => PromiseLike<unknown> | void;
  onCloseOutcome?: (outcome: CloseOutcome) => void;
}

function report(onCloseOutcome: ((o: CloseOutcome) => void) | undefined, outcome: CloseOutcome) {
  try {
    onCloseOutcome?.(outcome);
  } catch {
    // a diagnostic hook must never break cleanup
  }
}

function requestClose<C>(deps: AccountChannelsDeps<C>, channel: C) {
  let result: PromiseLike<unknown> | void;
  try {
    result = deps.close(channel);
  } catch {
    report(deps.onCloseOutcome, "failed");
    return;
  }
  // Handlers are attached to whatever came back, so a rejection is always handled.
  Promise.resolve(result).then(
    (status) => report(deps.onCloseOutcome, status === "ok" ? "ok" : "unconfirmed"),
    () => report(deps.onCloseOutcome, "failed")
  );
}

export function openAccountChannels<C>(deps: AccountChannelsDeps<C>): { stop: () => void } {
  const startedAt = deps.getGeneration();
  let stopped = false;
  let channels: C[] = [];
  const isCurrent = () => !stopped && startedAt === deps.getGeneration();

  (async () => {
    let userId: string | null;
    try {
      userId = await deps.getUserId();
    } catch {
      return;
    }
    if (!userId || !isCurrent()) return;
    channels = deps.open(userId, isCurrent);
  })();

  return {
    stop() {
      stopped = true;
      const open = channels;
      channels = [];
      open.forEach((c) => requestClose(deps, c));
    },
  };
}
