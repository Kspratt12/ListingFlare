"use client";

import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgentProfile } from "@/lib/types";

// auth.getUser() is a network round-trip to Supabase Auth. Dashboard routes
// are already verified server-side by the middleware, and every query is
// protected by RLS, so client code only needs the user ID, which getSession()
// reads locally (no network unless the token needs refreshing).
let cachedUserId: string | null = null;
let pendingUserId: Promise<string | null> | null = null;

export function getLocalUserId(): Promise<string | null> {
  if (cachedUserId) return Promise.resolve(cachedUserId);
  if (!pendingUserId) {
    pendingUserId = createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        cachedUserId = session?.user.id ?? null;
        return cachedUserId;
      })
      .finally(() => {
        pendingUserId = null;
      });
  }
  return pendingUserId;
}

// Synchronous peek for first-render state initializers (null until resolved).
export function peekLocalUserId(): string | null {
  return cachedUserId;
}

export function resetLocalUserId() {
  cachedUserId = null;
  pendingUserId = null;
}

interface AgentSessionValue {
  userId: string | null;
  profile: AgentProfile | null;
  setProfile: Dispatch<SetStateAction<AgentProfile | null>>;
}

// Provided by the dashboard layout, which loads the profile once. Tabs read
// it from memory instead of refetching the same row.
export const AgentSessionContext = createContext<AgentSessionValue>({
  userId: null,
  profile: null,
  setProfile: () => {},
});

export function useAgentSession() {
  return useContext(AgentSessionContext);
}
