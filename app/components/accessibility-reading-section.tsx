"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Check, RotateCcw } from "lucide-react";
import { useAccessibility } from "@/app/lib/accessibility-context";
import { resetPaneSettings } from "@/app/lib/a11y-catalog";
import type { ReadingGuideStyle } from "@/app/lib/a11y-reading-aids";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const GUIDE_OPTIONS: {
  id: ReadingGuideStyle;
  label: string;
  note: string;
}[] = [
  { id: "off", label: "Off", note: "No guide bar" },
  { id: "underline", label: "Underline", note: "Crisp horizontal line" },
  { id: "band", label: "Highlight Band", note: "Soft tinted strip" },
];

interface VoiceOption {
  uri: string;
  label: string;
}

export function AccessibilityReadingSection({
  activeCount,
}: {
  activeCount: number;
}) {
  const { settings, updateReadingAids, replaceSettings } = useAccessibility();
  const ra = settings.readingAids;

  const guideHeightId = useId();
  const maskToggleId = useId();
  const maskHeightId = useId();
  const maskOpacityId = useId();
  const magToggleId = useId();
  const magScaleId = useId();
  const speechToggleId = useId();
  const speechRateId = useId();
  const speechVoiceId = useId();
  const speechHighlightId = useId();
  const speechClickId = useId();

  const [voices, setVoices] = useState<VoiceOption[]>([]);

  const supportsSpeech = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false
  );

  useEffect(() => {
    if (!supportsSpeech) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const list = synth
        .getVoices()
        .map((v) => ({
          uri: v.voiceURI,
          label: `${v.name} (${v.lang})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setVoices(list);
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, [supportsSpeech]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Interactive Reading Tools
          </h3>
          <p className="text-xs text-muted-foreground">
            Line tracking, live magnification, and built-in audio narration—all
            hidden automatically when printing.
          </p>
        </div>
        {activeCount > 0 && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() =>
              replaceSettings((prev) => resetPaneSettings(prev, "tools"))
            }
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>Reset reading tools</span>
          </Button>
        )}
      </div>

      {/* 1. Unified Reading Guide (with optional Focus Mask complement) */}
      <fieldset className="space-y-3">
        <div>
          <legend className="text-sm font-semibold text-foreground">
            Reading Guide
          </legend>
          <p className="text-xs text-muted-foreground">
            Tracks your pointer and keyboard focus across lines—optionally add a
            focus mask to dim everything outside the guide.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {GUIDE_OPTIONS.map((opt) => {
            const selected = ra.guideStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={selected}
                onClick={() => updateReadingAids({ guideStyle: opt.id })}
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

        {ra.guideStyle !== "off" && (
          <div className="space-y-3 rounded-xl border border-border bg-surface/40 p-3.5">
            {ra.guideStyle === "band" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor={guideHeightId}
                    className="font-medium text-foreground"
                  >
                    Band height
                  </label>
                  <span className="font-mono text-muted-foreground">
                    {ra.guideHeight}px
                  </span>
                </div>
                <input
                  id={guideHeightId}
                  type="range"
                  min={32}
                  max={224}
                  step={8}
                  value={ra.guideHeight}
                  aria-valuetext={`${ra.guideHeight} pixels tall`}
                  onChange={(e) =>
                    updateReadingAids({ guideHeight: Number(e.target.value) })
                  }
                  className="a11y-range"
                />
              </div>
            )}

            <div
              className={cn(
                "flex items-start justify-between gap-4",
                ra.guideStyle === "band" && "border-t border-border pt-3"
              )}
            >
              <label
                htmlFor={maskToggleId}
                className="flex-1 cursor-pointer space-y-0.5"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span>Dim outside the reading guide (Focus Mask)</span>
                  {ra.focusMask && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1.5 text-[10px]"
                    >
                      On
                    </Badge>
                  )}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {ra.guideStyle === "band"
                    ? "Darkens the page above and below your highlight band to isolate the active lines."
                    : "Opens a clear spotlight window right above the underline ruler and dims the rest of the page."}
                </span>
              </label>
              <input
                id={maskToggleId}
                type="checkbox"
                checked={ra.focusMask}
                onChange={(e) =>
                  updateReadingAids({ focusMask: e.target.checked })
                }
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
              />
            </div>

            {ra.focusMask && (
              <div
                className={cn(
                  "grid gap-3 pt-1",
                  ra.guideStyle === "underline" && "sm:grid-cols-2"
                )}
              >
                {ra.guideStyle === "underline" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor={maskHeightId}
                        className="font-medium text-foreground"
                      >
                        Spotlight height
                      </label>
                      <span className="font-mono text-muted-foreground">
                        {ra.focusMaskHeight}px
                      </span>
                    </div>
                    <input
                      id={maskHeightId}
                      type="range"
                      min={80}
                      max={240}
                      step={10}
                      value={ra.focusMaskHeight}
                      aria-valuetext={`${ra.focusMaskHeight} pixels`}
                      onChange={(e) =>
                        updateReadingAids({
                          focusMaskHeight: Number(e.target.value),
                        })
                      }
                      className="a11y-range"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor={maskOpacityId}
                      className="font-medium text-foreground"
                    >
                      Outside darkness
                    </label>
                    <span className="font-mono text-muted-foreground">
                      {ra.focusMaskOpacity}%
                    </span>
                  </div>
                  <input
                    id={maskOpacityId}
                    type="range"
                    min={35}
                    max={80}
                    step={5}
                    value={ra.focusMaskOpacity}
                    aria-valuetext={`${ra.focusMaskOpacity} percent`}
                    onChange={(e) =>
                      updateReadingAids({
                        focusMaskOpacity: Number(e.target.value),
                      })
                    }
                    className="a11y-range"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </fieldset>

      <Separator />

      {/* 2. Live Text Magnifier */}
      <div className="space-y-3 rounded-xl border border-border bg-surface/40 p-3.5">
        <div className="flex items-start justify-between gap-4">
          <label
            htmlFor={magToggleId}
            className="flex-1 cursor-pointer space-y-0.5"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span>Live Text Magnifier</span>
              {ra.textMagnifier && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {ra.magnifierScale.toFixed(2)}×
                </Badge>
              )}
            </span>
            <span className="block text-xs text-muted-foreground">
              Displays an enlarged high-contrast reading strip at the bottom of
              the screen for any hovered or focused text.
            </span>
          </label>
          <input
            id={magToggleId}
            type="checkbox"
            checked={ra.textMagnifier}
            onChange={(e) =>
              updateReadingAids({ textMagnifier: e.target.checked })
            }
            className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
          />
        </div>

        {ra.textMagnifier && (
          <div className="space-y-1 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor={magScaleId} className="font-medium text-foreground">
                Magnification level
              </label>
              <span className="font-mono text-muted-foreground">
                {ra.magnifierScale.toFixed(2)}×
              </span>
            </div>
            <input
              id={magScaleId}
              type="range"
              min={1.5}
              max={2.25}
              step={0.25}
              value={ra.magnifierScale}
              aria-valuetext={`${ra.magnifierScale.toFixed(2)} times`}
              onChange={(e) =>
                updateReadingAids({ magnifierScale: Number(e.target.value) })
              }
              className="a11y-range"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* 3. Built-in Read Aloud (Text-to-Speech) */}
      <div className="space-y-3 rounded-xl border border-border bg-surface/40 p-3.5">
        <div className="flex items-start justify-between gap-4">
          <label
            htmlFor={speechToggleId}
            className="flex-1 cursor-pointer space-y-0.5"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span>Built-in Read Aloud (Text-to-Speech)</span>
              {ra.readAloudEnabled && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  On
                </Badge>
              )}
            </span>
            <span className="block text-xs text-muted-foreground">
              Shows a floating player using your browser&apos;s speech engine to
              read course pages or highlighted selections aloud.
            </span>
          </label>
          <input
            id={speechToggleId}
            type="checkbox"
            checked={ra.readAloudEnabled}
            onChange={(e) =>
              updateReadingAids({ readAloudEnabled: e.target.checked })
            }
            className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
          />
        </div>

        {ra.readAloudEnabled && (
          <div className="space-y-3 border-t border-border pt-3">
            {!supportsSpeech ? (
              <p className="text-xs text-muted-foreground">
                This browser does not expose the Web Speech API.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor={speechRateId}
                      className="font-medium text-foreground"
                    >
                      Reading speed
                    </label>
                    <span className="font-mono text-muted-foreground">
                      {ra.readAloudRate.toFixed(2)}×
                    </span>
                  </div>
                  <input
                    id={speechRateId}
                    type="range"
                    min={0.75}
                    max={2}
                    step={0.05}
                    value={ra.readAloudRate}
                    aria-valuetext={`${ra.readAloudRate.toFixed(2)} times speed`}
                    onChange={(e) =>
                      updateReadingAids({
                        readAloudRate: Number(e.target.value),
                      })
                    }
                    className="a11y-range"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={speechVoiceId}
                    className="block text-xs font-medium text-foreground"
                  >
                    Voice
                  </label>
                  <select
                    id={speechVoiceId}
                    value={ra.readAloudVoiceUri}
                    onChange={(e) =>
                      updateReadingAids({ readAloudVoiceUri: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Browser default voice</option>
                    {voices.map((v) => (
                      <option key={v.uri} value={v.uri}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-start justify-between gap-3">
                    <label
                      htmlFor={speechHighlightId}
                      className="flex-1 cursor-pointer space-y-0.5"
                    >
                      <span className="block text-xs font-medium text-foreground">
                        Highlight active paragraph while speaking
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        Visually tracks and scrolls to each spoken block, with
                        previous/next skip controls.
                      </span>
                    </label>
                    <input
                      id={speechHighlightId}
                      type="checkbox"
                      checked={ra.readAloudHighlight}
                      onChange={(e) =>
                        updateReadingAids({
                          readAloudHighlight: e.target.checked,
                        })
                      }
                      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <label
                      htmlFor={speechClickId}
                      className="flex-1 cursor-pointer space-y-0.5"
                    >
                      <span className="block text-xs font-medium text-foreground">
                        Click any paragraph to read aloud
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        Click a heading or paragraph in course notes to start
                        listening from there (or highlight text to Read
                        Selection).
                      </span>
                    </label>
                    <input
                      id={speechClickId}
                      type="checkbox"
                      checked={ra.readAloudClickToRead}
                      onChange={(e) =>
                        updateReadingAids({
                          readAloudClickToRead: e.target.checked,
                        })
                      }
                      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
