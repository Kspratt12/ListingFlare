"use client";

import { useState } from "react";

/** Copies the given URL to the clipboard and briefly confirms it. */
export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (older browsers, insecure context). Fall back to a prompt.
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex h-8 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
      aria-label="Copy link"
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
