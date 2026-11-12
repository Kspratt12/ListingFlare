"use client";

import { useEffect, useRef } from "react";

// A non-blocking "before you publish" notice. It never prevents publishing and never discards the
// draft: "Publish anyway" continues, "Go back and edit" just closes it. Focus moves here when it
// opens so keyboard and screen-reader users are not left on the button that triggered it.
export default function PublishReviewNotice({
  gaps,
  onPublishAnyway,
  onGoBack,
  busy,
  idPrefix,
}: {
  gaps: string[];
  onPublishAnyway: () => void;
  onGoBack: () => void;
  busy?: boolean;
  idPrefix: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const headingId = `${idPrefix}-publish-review-heading`;
  return (
    <div
      ref={ref}
      id={`${idPrefix}-publish-review`}
      tabIndex={-1}
      role="region"
      aria-labelledby={headingId}
      className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
    >
      <h3 id={headingId} className="font-semibold">
        Before you publish
      </h3>
      <p className="mt-1">You can still publish. These are only things buyers will not see:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {gaps.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-800">Your draft is kept either way.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onPublishAnyway}
          disabled={busy}
          className="rounded-lg bg-gray-950 min-h-[44px] px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Publish anyway
        </button>
        <button
          type="button"
          onClick={onGoBack}
          className="rounded-lg border border-amber-300 bg-white min-h-[44px] px-4 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          Go back and edit
        </button>
      </div>
    </div>
  );
}
