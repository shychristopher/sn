"use client";

import { Fragment } from "react";
import { useAccessibility } from "@/app/lib/accessibility-context";

/**
 * Screen-reader-safe Guided Word Anchors (Bionic-style reading).
 * When active, provides the intact sentence to assistive technologies via `.sr-only`
 * and renders the bolded fixation anchors inside `aria-hidden="true"` so screen readers
 * never pause mid-word.
 */
export function BionicText({ text }: { text: string }) {
  const { settings } = useAccessibility();

  if (!settings.readingAids.bionicReading) {
    return <>{text}</>;
  }

  const tokens = text.split(/(\s+)/);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {tokens.map((token, idx) => {
          if (!token || /^\s+$/.test(token)) {
            return <Fragment key={idx}>{token}</Fragment>;
          }

          // Match leading punctuation + letters/digits + trailing punctuation
          const match = token.match(/^([^A-Za-z0-9]*)([A-Za-z0-9']+)(.*)$/);
          if (!match) {
            return <Fragment key={idx}>{token}</Fragment>;
          }

          const [, prefix, core, suffix] = match;
          if (core.length < 2) {
            return <Fragment key={idx}>{token}</Fragment>;
          }

          const anchorLen =
            core.length <= 3 ? 1 : Math.ceil(core.length * 0.42);
          const head = core.slice(0, anchorLen);
          const tail = core.slice(anchorLen);

          return (
            <Fragment key={idx}>
              {prefix}
              <strong className="font-semibold text-foreground">{head}</strong>
              {tail}
              {suffix}
            </Fragment>
          );
        })}
      </span>
    </>
  );
}
