"use client";

import { useId } from "react";
import { Check, RotateCcw } from "lucide-react";
import { useAccessibility } from "@/app/lib/accessibility-context";
import type { MediaMode } from "@/app/lib/a11y-themes";
import { resetPaneSettings } from "@/app/lib/a11y-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const MEDIA_MODE_OPTIONS: {
  value: MediaMode;
  label: string;
  note: string;
}[] = [
  { value: "normal", label: "Normal", note: "Show all media" },
  { value: "dim", label: "Dim Media", note: "Lower glare on images" },
  { value: "hide", label: "Hide Media", note: "Text-only, alt kept" },
];

export function AccessibilityFocusSection({
  activeCount,
}: {
  activeCount: number;
}) {
  const { settings, updateDisplayComfort, replaceSettings } =
    useAccessibility();
  const {
    distractionFree,
    reduceMotion,
    reduceTransparency,
    mediaMode,
    pauseMedia,
  } = settings.display;

  const distractionId = useId();
  const motionId = useId();
  const transparencyId = useId();
  const pauseMediaId = useId();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Focus, Motion &amp; Media
          </h3>
          <p className="text-xs text-muted-foreground">
            Quiet visual clutter, stop movement, and calm bright images while
            studying.
          </p>
        </div>
        {activeCount > 0 && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() =>
              replaceSettings((prev) => resetPaneSettings(prev, "focus"))
            }
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>Reset focus &amp; motion</span>
          </Button>
        )}
      </div>

      {/* 1. Distraction-Free Study Mode */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <label
          htmlFor={distractionId}
          className="flex-1 cursor-pointer space-y-1"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>Distraction-free study mode</span>
            {distractionFree && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                On
              </Badge>
            )}
          </span>
          <span className="block text-xs leading-relaxed text-muted-foreground">
            Hides avatars and decorative chrome and softly fades top navigation
            bars until hovered or focused.
          </span>
        </label>
        <input
          id={distractionId}
          type="checkbox"
          checked={distractionFree}
          onChange={(e) =>
            updateDisplayComfort({ distractionFree: e.target.checked })
          }
          className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
        />
      </div>

      <Separator />

      {/* 2. Motion & Surface Calm */}
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">
            Motion &amp; Surfaces
          </h4>
          <p className="text-xs text-muted-foreground">
            Eliminate animations, smooth scrolling, and translucent glass
            effects.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface/40 p-3.5">
            <label
              htmlFor={motionId}
              className="flex-1 cursor-pointer space-y-0.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>Reduce motion</span>
                {reduceMotion && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    On
                  </Badge>
                )}
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Disables UI transitions, hover animations, and smooth scrolling
                site-wide.
              </span>
            </label>
            <input
              id={motionId}
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) =>
                updateDisplayComfort({ reduceMotion: e.target.checked })
              }
              className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface/40 p-3.5">
            <label
              htmlFor={transparencyId}
              className="flex-1 cursor-pointer space-y-0.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>Reduce transparency</span>
                {reduceTransparency && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    On
                  </Badge>
                )}
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Replaces blurred or translucent headers and backdrops with solid
                opaque surfaces.
              </span>
            </label>
            <input
              id={transparencyId}
              type="checkbox"
              checked={reduceTransparency}
              onChange={(e) =>
                updateDisplayComfort({ reduceTransparency: e.target.checked })
              }
              className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface/40 p-3.5">
            <label
              htmlFor={pauseMediaId}
              className="flex-1 cursor-pointer space-y-0.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>Pause autoplay &amp; looping animations</span>
                {pauseMedia && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    On
                  </Badge>
                )}
              </span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                Stops embedded video/audio autoplay and freezes continuous CSS
                keyframe animations.
              </span>
            </label>
            <input
              id={pauseMediaId}
              type="checkbox"
              checked={pauseMedia}
              onChange={(e) =>
                updateDisplayComfort({ pauseMedia: e.target.checked })
              }
              className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* 3. Images & Media */}
      <fieldset className="space-y-3">
        <div>
          <legend className="text-sm font-semibold text-foreground">
            Images &amp; Media
          </legend>
          <p className="text-xs text-muted-foreground">
            Dim bright photos or hide visual media to lower sensory load while
            keeping alt text accessible.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {MEDIA_MODE_OPTIONS.map((opt) => {
            const selected = mediaMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => updateDisplayComfort({ mediaMode: opt.value })}
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
  );
}
