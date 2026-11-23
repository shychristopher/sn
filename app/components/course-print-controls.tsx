"use client";

import { useEffect, useState } from "react";

/**
 * Provides a Print Preview toggle (strips all `.no-print` layout chrome on screen
 * and frames the course like a printed page) plus direct browser printing.
 */
export function CoursePrintControls() {
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isPreview) {
      root.setAttribute("data-print-preview", "true");
    } else {
      root.removeAttribute("data-print-preview");
    }

    return () => {
      root.removeAttribute("data-print-preview");
    };
  }, [isPreview]);

  return (
    <>
      {/* Standard inline toolbar (hidden during Print Preview and @media print) */}
      <div className="no-print mb-6 flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => setIsPreview(true)}
          className="rounded border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:underline"
        >
          Print Preview
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded border border-border px-3 py-1.5 text-sm font-medium hover:underline"
        >
          Print Course
        </button>
      </div>

      {/* Floating bar shown ONLY during Print Preview (hidden in @media print) */}
      {isPreview && (
        <div
          role="region"
          aria-label="Print preview controls"
          className="print-preview-bar fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-lg"
        >
          <span className="font-medium">Print Preview</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded bg-zinc-900 px-3 py-1 text-white"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            className="rounded border border-zinc-300 px-3 py-1"
          >
            Exit Preview
          </button>
        </div>
      )}
    </>
  );
}
