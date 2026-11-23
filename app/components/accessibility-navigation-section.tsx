"use client";

import { useId } from "react";
import { Check, RotateCcw } from "lucide-react";
import { useAccessibility } from "@/app/lib/accessibility-context";
import type { FocusHighlightMode } from "@/app/lib/a11y-themes";
import type { CursorMode } from "@/app/lib/a11y-reading-aids";
import { resetPaneSettings } from "@/app/lib/a11y-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const CURSOR_OPTIONS: { id: CursorMode; label: string; note: string }[] = [
  { id: "default", label: "Default", note: "System pointer" },
  { id: "large-dark", label: "Large Dark", note: "Black + white edge" },
  { id: "large-light", label: "Large Light", note: "White + black edge" },
];

const FOCUS_STYLE_OPTIONS: {
  id: FocusHighlightMode;
  label: string;
  note: string;
}[] = [
  { id: "default", label: "Keyboard Only", note: "Standard focus-visible" },
  { id: "always", label: "Always Visible", note: "Mouse & keyboard focus" },
  {
    id: "high-contrast",
    label: "High-Contrast Ring",
    note: "Yellow + black double ring",
  },
];

export function AccessibilityNavigationSection({
  activeCount,
}: {
  activeCount: number;
}) {
  const {
    settings,
    updateDisplayComfort,
    updateReadingAids,
    replaceSettings,
  } = useAccessibility();

  const {
    uiScale,
    largeTargets,
    focusHighlight,
    strongBoundaries,
    underlineLinks,
    keyboardShortcuts,
    disableSingleKeyShortcuts,
  } = settings.display;
  const cursorMode = settings.readingAids.cursorMode;

  const uiScaleId = useId();
  const largeTargetsId = useId();
  const boundariesId = useId();
  const underlineId = useId();
  const shortcutsId = useId();
  const noSingleKeyId = useId();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Navigation, Pointer &amp; Input
          </h3>
          <p className="text-xs text-muted-foreground">
            Resize interface controls, enlarge targets and cursor, sharpen
            outlines, and manage shortcuts.
          </p>
        </div>
        {activeCount > 0 && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() =>
              replaceSettings((prev) => resetPaneSettings(prev, "navigation"))
            }
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>Reset navigation &amp; input</span>
          </Button>
        )}
      </div>

      {/* 1. Interface (UI) Scale */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label
              htmlFor={uiScaleId}
              className="text-sm font-semibold text-foreground"
            >
              Interface (UI) Scale
            </label>
            <p className="text-xs text-muted-foreground">
              Scales the entire interface—navbar, sidebar, buttons, icons, and
              text—on top of your OS default size.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="font-mono text-xs">
              {uiScale}%
            </Badge>
            {uiScale !== 100 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Reset interface scale to 100%"
                onClick={() => updateDisplayComfort({ uiScale: 100 })}
              >
                <RotateCcw className="size-3" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uiScale <= 85}
            aria-label="Decrease interface scale"
            onClick={() =>
              updateDisplayComfort({ uiScale: Math.max(85, uiScale - 5) })
            }
          >
            −
          </Button>
          <input
            id={uiScaleId}
            type="range"
            min={85}
            max={140}
            step={5}
            value={uiScale}
            aria-valuetext={`${uiScale} percent interface scale`}
            onChange={(e) =>
              updateDisplayComfort({ uiScale: Number(e.target.value) })
            }
            className="a11y-range"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uiScale >= 140}
            aria-label="Increase interface scale"
            onClick={() =>
              updateDisplayComfort({ uiScale: Math.min(140, uiScale + 5) })
            }
          >
            +
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[90, 100, 115, 125, 140].map((pct) => (
            <Button
              key={pct}
              type="button"
              size="xs"
              variant={uiScale === pct ? "default" : "outline"}
              aria-pressed={uiScale === pct}
              onClick={() => updateDisplayComfort({ uiScale: pct })}
            >
              {pct === 100 ? "100% (OS Default)" : `${pct}%`}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* 2. Pointer & Tap Targets */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface/40 p-3.5">
          <label
            htmlFor={largeTargetsId}
            className="flex-1 cursor-pointer space-y-0.5"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span>Larger click &amp; tap targets (44×44px)</span>
              {largeTargets && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  AAA
                </Badge>
              )}
            </span>
            <span className="block text-xs leading-relaxed text-muted-foreground">
              Enforces a minimum 44×44px target area on buttons, nav links,
              sidebar rows, inputs, and checkboxes.
            </span>
          </label>
          <input
            id={largeTargetsId}
            type="checkbox"
            checked={largeTargets}
            onChange={(e) =>
              updateDisplayComfort({ largeTargets: e.target.checked })
            }
            className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
          />
        </div>

        <fieldset className="space-y-2.5">
          <div>
            <legend className="text-xs font-semibold text-foreground">
              High-Visibility Cursor
            </legend>
            <p className="text-xs text-muted-foreground">
              Switch to an oversized high-contrast pointer that&apos;s easy to
              locate across wide displays.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {CURSOR_OPTIONS.map((opt) => {
              const selected = cursorMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => updateReadingAids({ cursorMode: opt.id })}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected
                      ? "border-primary bg-accent ring-1 ring-primary"
                      : "border-border bg-background hover:bg-surface/70"
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground">
                      {opt.label}
                    </span>
                    {selected && (
                      <Check
                        className="size-3.5 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {opt.note}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <Separator />

      {/* 3. Visual Landmarks & Focus Outlines */}
      <div className="space-y-4">
        <fieldset className="space-y-2.5">
          <div>
            <legend className="text-xs font-semibold text-foreground">
              Focus Outline Visibility
            </legend>
            <p className="text-xs text-muted-foreground">
              Control how clearly the currently focused element stands out.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {FOCUS_STYLE_OPTIONS.map((opt) => {
              const selected = focusHighlight === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    updateDisplayComfort({ focusHighlight: opt.id })
                  }
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected
                      ? "border-primary bg-accent ring-1 ring-primary"
                      : "border-border bg-background hover:bg-surface/70"
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground">
                      {opt.label}
                    </span>
                    {selected && (
                      <Check
                        className="size-3.5 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {opt.note}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface/40 p-3.5">
            <label
              htmlFor={boundariesId}
              className="flex-1 cursor-pointer space-y-0.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>Stronger borders &amp; focus rings</span>
                {strongBoundaries && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    On
                  </Badge>
                )}
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Reinforces card, button, and input outlines and thickens
                keyboard focus rings site-wide.
              </span>
            </label>
            <input
              id={boundariesId}
              type="checkbox"
              checked={strongBoundaries}
              onChange={(e) =>
                updateDisplayComfort({ strongBoundaries: e.target.checked })
              }
              className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface/40 p-3.5">
            <label
              htmlFor={underlineId}
              className="flex-1 cursor-pointer space-y-0.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>Always underline links</span>
                {underlineLinks && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    On
                  </Badge>
                )}
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Keeps every hyperlink visibly underlined so links never rely on
                color alone.
              </span>
            </label>
            <input
              id={underlineId}
              type="checkbox"
              checked={underlineLinks}
              onChange={(e) =>
                updateDisplayComfort({ underlineLinks: e.target.checked })
              }
              className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* 4. Keyboard & Voice Control */}
      <div className="space-y-2.5 rounded-xl border border-border bg-surface/40 p-3.5">
        <div className="flex items-start justify-between gap-4">
          <label
            htmlFor={shortcutsId}
            className="flex-1 cursor-pointer space-y-0.5"
          >
            <span className="text-sm font-medium text-foreground">
              Quick accessibility keyboard shortcuts
            </span>
            <span className="block text-xs leading-relaxed text-muted-foreground">
              Use{" "}
              <kbd className="rounded border border-border bg-background px-1 font-mono text-[10px]">
                Alt+Shift+A
              </kbd>{" "}
              (Settings),{" "}
              <kbd className="rounded border border-border bg-background px-1 font-mono text-[10px]">
                Alt+Shift+G
              </kbd>{" "}
              (Reading Guide), and{" "}
              <kbd className="rounded border border-border bg-background px-1 font-mono text-[10px]">
                Alt+Shift+R
              </kbd>{" "}
              (Read Aloud).
            </span>
          </label>
          <input
            id={shortcutsId}
            type="checkbox"
            checked={keyboardShortcuts}
            onChange={(e) =>
              updateDisplayComfort({ keyboardShortcuts: e.target.checked })
            }
            className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
          />
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-border pt-3">
          <label
            htmlFor={noSingleKeyId}
            className="flex-1 cursor-pointer space-y-0.5"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span>Disable single-key shortcuts</span>
              {disableSingleKeyShortcuts && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  WCAG 2.1.4
                </Badge>
              )}
            </span>
            <span className="block text-xs leading-relaxed text-muted-foreground">
              Prevents single-letter hotkeys from firing accidentally when using
              voice dictation or switch controls.
            </span>
          </label>
          <input
            id={noSingleKeyId}
            type="checkbox"
            checked={disableSingleKeyShortcuts}
            onChange={(e) =>
              updateDisplayComfort({
                disableSingleKeyShortcuts: e.target.checked,
              })
            }
            className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
          />
        </div>
      </div>
    </div>
  );
}
