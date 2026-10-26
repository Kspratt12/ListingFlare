"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// The signup button in the header of the public marketing pages. Those pages are
// pre-rendered for Google, so the HTML always carries the signup button. Once the
// page loads in a browser we check for a session, and signed-in visitors see a link
// to their dashboard instead of being asked to start a trial they already have.
export default function NavAuthCta({
  className,
  label = "Start Free Trial",
}: {
  className?: string;
  label?: string;
}) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      const supabase = createClient();
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (active && data.session) setLoggedIn(true);
        })
        .catch(() => {});
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setLoggedIn(!!session);
      });
      return () => {
        active = false;
        sub.subscription.unsubscribe();
      };
    } catch {
      // No session check available: keep showing the signup button.
    }
  }, []);

  if (loggedIn) {
    return (
      <Link href="/dashboard" className={className}>
        My Dashboard
      </Link>
    );
  }
  return (
    <Link href="/signup" className={className}>
      {label}
    </Link>
  );
}
