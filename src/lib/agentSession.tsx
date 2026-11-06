"use client";

import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import { setCacheOwner } from "@/lib/swrCache";
import { createSessionManager } from "@/lib/sessionState";
import type { AgentProfile } from "@/lib/types";

// auth.getUser() is a network round-trip to Supabase Auth. Dashboard routes
// are already verified server-side by the middleware, and every query is
// protected by RLS, so client code only needs the user ID, which getSession()
// reads locally (no network unless the token needs refreshing).
//
// The ID, its generation counter and the account-change handling live in
// sessionState.ts. Here it is wired to the real Supabase client and the
// dashboard cache: whenever the account changes (sign-out, another tab, a
// different sign-in), the cache owner changes in the same step, so one
// account's cached rows are never readable by another.
const manager = createSessionManager({
  readSession: () => createClient().auth.getSession().then(({ data: { session } }) => session?.user.id ?? null),
  watchAuth: (onEvent) => {
    createClient().auth.onAuthStateChange((event, session) => onEvent(event, session?.user.id ?? null));
  },
  onUserChanged: (userId) => setCacheOwner(userId),
});

export function getLocalUserId(): Promise<string | null> {
  return manager.getUserId();
}

// Synchronous peek for first-render state initializers (null until resolved).
export function peekLocalUserId(): string | null {
  return manager.peekUserId();
}

// Changes every time the signed-in account changes. Async work remembers it and drops its result if it moved.
export function getSessionGeneration(): number {
  return manager.getGeneration();
}

// The three inputs of useSyncExternalStore. subscribeToSessionChanges is a module-level function, so its identity is
// stable across renders; the listener is called synchronously after the account, the generation and the cache owner are
// coherent, and only when the account or the generation changed (never for a same-user token refresh).
export function subscribeToSessionChanges(listener: () => void): () => void {
  return manager.subscribe(listener);
}

// { generation, userId }: the same object until the account or the generation changes.
export function getSessionSnapshot() {
  return manager.getSnapshot();
}

// What the server renders and what the client reports before any account is known: constant, so hydration agrees.
export function getServerSessionSnapshot() {
  return manager.getServerSnapshot();
}

export function resetLocalUserId() {
  manager.reset();
}

interface AgentSessionValue {
  userId: string | null;
  profile: AgentProfile | null;
  setProfile: Dispatch<SetStateAction<AgentProfile | null>>;
  // Increments each time the account changes. Tabs reload their data when it moves.
  sessionEpoch: number;
}

// Provided by the dashboard layout, which loads the profile once. Tabs read
// it from memory instead of refetching the same row.
export const AgentSessionContext = createContext<AgentSessionValue>({
  userId: null,
  profile: null,
  setProfile: () => {},
  sessionEpoch: 0,
});

export function useAgentSession() {
  return useContext(AgentSessionContext);
}
