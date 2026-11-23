"use client";

import { useId, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useAccessibility } from "@/app/lib/accessibility-context";
import {
  A11Y_THEMES,
  COLOR_TOKEN_META,
  DARK_BASE_COLORS,
  LIGHT_BASE_COLORS,
  TINT_PRESETS,
  getAccessibleForeground,
  getContrastRatio,
  normalizeHex,
  type CustomColorKey,
  type SaturationLevel,
} from "@/app/lib/a11y-themes";
import { resetPaneSettings } from "@/app/lib/a11y-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const SATURATION_OPTIONS: {
  value: SaturationLevel;
  label: string;
  note: string;
}[] = [
  { value: 100, label: "Normal (100%)", note: "Full color" },
  { value: 50, label: "Muted (50%)", note: "Softer chroma" },
  { value: 0, label: "Grayscale (0%)", note: "Monochrome" },
];

function ContrastBadge({ label, ratio }: { label: string; ratio: number }) {
  const formatted = `${ratio.toFixed(1)}:1`;
  const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Low";
  const passes = ratio >= 4.5;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-mono font-medium text-foreground">
        {passes ? (
          <CheckCircle2
            className="size-3.5 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <AlertTriangle
            className="size-3.5 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
        )}
        <span>{formatted}</span>
        <Badge
          variant={passes ? "secondary" : "destructive"}
          className="h-4 px-1.5 text-[10px]"
        >
          {level}
        </Badge>
      </span>
    </div>
  );
}

function ColorOverrideRow({
  tokenKey,
  label,
  description,
  resolvedHex,
  isCustom,
  onChangeHex,
  onReset,
}: {
  tokenKey: CustomColorKey;
  label: string;
  description: string;
  resolvedHex: string;
  isCustom: boolean;
  onChangeHex: (hex: string) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputValue = draft ?? resolvedHex;
  const pickerId = `a11y-color-picker-${tokenKey}`;
  const textId = `a11y-color-hex-${tokenKey}`;

  const handleTextChange = (raw: string) => {
    setDraft(raw);
    const normalized = normalizeHex(raw);
    if (normalized && raw.replace("#", "").trim().length === 6) {
      onChangeHex(normalized);
      setDraft(null);
    }
  };

  const handleTextBlur = () => {
    if (draft !== null) {
      const normalized = normalizeHex(draft);
      if (normalized) {
        onChangeHex(normalized);
      }
      setDraft(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <label
            htmlFor={pickerId}
            className="text-xs font-semibold text-foreground"
          >
            {label}
          </label>
          {isCustom && (
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
              Custom
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id={pickerId}
          type="color"
          value={resolvedHex}
          onChange={(e) => {
            setDraft(null);
            onChangeHex(e.target.value);
          }}
          aria-label={`Pick ${label.toLowerCase()} color`}
          className="a11y-swatch h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
        />

        <label htmlFor={textId} className="sr-only">
          {label} hex value
        </label>
        <Input
          id={textId}
          value={inputValue}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          maxLength={7}
          spellCheck={false}
          className="h-8 w-24 font-mono text-xs"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={!isCustom}
          onClick={onReset}
          aria-label={`Reset ${label.toLowerCase()} to preset default`}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function AccessibilityColorLightSection({
  activeCount,
}: {
  activeCount: number;
}) {
  const {
    settings,
    systemScheme,
    resolvedColors,
    hasCustomColors,
    setTheme,
    setCustomColor,
    clearCustomColor,
    clearAllCustomColors,
    updateDisplayComfort,
    replaceSettings,
  } = useAccessibility();

  const { brightness, saturation, tint, tintOpacity } = settings.display;
  const [paletteOpen, setPaletteOpen] = useState(hasCustomColors);

  const brightnessId = useId();
  const tintOpacityId = useId();

  const bodyContrast = getContrastRatio(
    resolvedColors.foreground,
    resolvedColors.background
  );
  const mutedContrast = getContrastRatio(
    resolvedColors.mutedForeground,
    resolvedColors.background
  );
  const primaryFg = getAccessibleForeground(resolvedColors.primary);
  const primaryContrast = getContrastRatio(primaryFg, resolvedColors.primary);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Color &amp; Light Comfort
          </h3>
          <p className="text-xs text-muted-foreground">
            Choose a contrast theme, soften harsh glare, or apply a calm visual
            tint.
          </p>
        </div>
        {activeCount > 0 && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() =>
              replaceSettings((prev) => resetPaneSettings(prev, "color-light"))
            }
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span>Reset color &amp; light</span>
          </Button>
        )}
      </div>

      {/* 1. Theme Presets */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-foreground">
          Theme Presets
        </legend>

        <div className="grid gap-2 sm:grid-cols-2">
          {A11Y_THEMES.map((preset) => {
            const selected = settings.display.theme === preset.id;
            const swatchColors =
              preset.id === "system"
                ? systemScheme === "dark"
                  ? DARK_BASE_COLORS
                  : LIGHT_BASE_COLORS
                : preset.colors;

            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setTheme(preset.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary bg-accent ring-1 ring-primary"
                    : "border-border bg-background hover:bg-surface/70"
                )}
              >
                <span
                  aria-hidden="true"
                  className="a11y-swatch mt-0.5 flex h-9 w-12 shrink-0 flex-col justify-between overflow-hidden rounded-md border p-1"
                  style={{
                    backgroundColor: swatchColors.background,
                    borderColor: swatchColors.border,
                  }}
                >
                  <span className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-5 rounded-full"
                      style={{ backgroundColor: swatchColors.foreground }}
                    />
                    <span
                      className="ml-auto size-2 rounded-full"
                      style={{ backgroundColor: swatchColors.primary }}
                    />
                  </span>
                  <span
                    className="h-2.5 w-full rounded-xs"
                    style={{ backgroundColor: swatchColors.surface }}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <span>{preset.name}</span>
                      {preset.badge && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 text-[10px] font-medium"
                        >
                          {preset.badge}
                        </Badge>
                      )}
                    </span>
                    {selected && (
                      <Check
                        className="size-3.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    {preset.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Collapsible Fine-Tune Individual Palette Colors */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface/40">
          <button
            type="button"
            aria-expanded={paletteOpen}
            onClick={() => setPaletteOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface/80 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <SlidersHorizontal
                className="size-3.5 text-primary"
                aria-hidden="true"
              />
              <span>Fine-tune individual palette colors</span>
              {hasCustomColors && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {Object.keys(settings.display.customColors).length} custom
                </Badge>
              )}
            </span>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                paletteOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>

          {paletteOpen && (
            <div className="space-y-3 border-t border-border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Override any token with live WCAG 2.1 contrast verification.
                </p>
                {hasCustomColors && (
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={clearAllCustomColors}
                  >
                    <RotateCcw className="size-3" aria-hidden="true" />
                    <span>Clear custom colors</span>
                  </Button>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <ContrastBadge label="Body text" ratio={bodyContrast} />
                <ContrastBadge label="Muted text" ratio={mutedContrast} />
                <ContrastBadge label="Buttons" ratio={primaryContrast} />
              </div>

              <div className="space-y-2">
                {COLOR_TOKEN_META.map((token) => (
                  <ColorOverrideRow
                    key={token.key}
                    tokenKey={token.key}
                    label={token.label}
                    description={token.description}
                    resolvedHex={resolvedColors[token.key]}
                    isCustom={Boolean(settings.display.customColors[token.key])}
                    onChangeHex={(hex) => setCustomColor(token.key, hex)}
                    onReset={() => clearCustomColor(token.key)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </fieldset>

      <Separator />

      {/* 2. Screen Dimmer */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label
              htmlFor={brightnessId}
              className="text-sm font-semibold text-foreground"
            >
              Screen Dimmer
            </label>
            <p className="text-xs text-muted-foreground">
              Lowers harsh brightness for migraines, photophobia, or locked
              monitors.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="font-mono text-xs">
              {brightness}%
            </Badge>
            {brightness !== 100 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Reset screen dimmer to 100%"
                onClick={() => updateDisplayComfort({ brightness: 100 })}
              >
                <RotateCcw className="size-3" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <input
          id={brightnessId}
          type="range"
          min={60}
          max={100}
          step={5}
          value={brightness}
          aria-valuetext={`${brightness} percent brightness`}
          onChange={(e) =>
            updateDisplayComfort({ brightness: Number(e.target.value) })
          }
          className="a11y-range"
        />

        <div className="flex flex-wrap gap-1.5">
          {[65, 80, 90, 100].map((level) => (
            <Button
              key={level}
              type="button"
              size="xs"
              variant={brightness === level ? "default" : "outline"}
              aria-pressed={brightness === level}
              onClick={() => updateDisplayComfort({ brightness: level })}
            >
              {level === 100 ? "100% (Off)" : `${level}%`}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* 3. Color Saturation */}
      <fieldset className="space-y-3">
        <div>
          <legend className="text-sm font-semibold text-foreground">
            Color Saturation
          </legend>
          <p className="text-xs text-muted-foreground">
            Tone down bright accents or switch to monochrome grayscale.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {SATURATION_OPTIONS.map((opt) => {
            const selected = saturation === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => updateDisplayComfort({ saturation: opt.value })}
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

      <Separator />

      {/* 4. Color Tint Overlay */}
      <fieldset className="space-y-3">
        <div>
          <legend className="text-sm font-semibold text-foreground">
            Color Tint Overlay
          </legend>
          <p className="text-xs text-muted-foreground">
            Soft screen-wide color veil to ease visual stress and glare.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {TINT_PRESETS.map((preset) => {
            const selected = tint === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => updateDisplayComfort({ tint: preset.id })}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary bg-accent ring-1 ring-primary"
                    : "border-border bg-background hover:bg-surface/70"
                )}
              >
                <span
                  aria-hidden="true"
                  className="a11y-swatch size-6 shrink-0 rounded-full border border-border"
                  style={{
                    backgroundColor: preset.hex ?? "transparent",
                    opacity: preset.hex ? 0.55 : 1,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground">
                      {preset.label}
                    </span>
                    {selected && (
                      <Check
                        className="size-3.5 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {preset.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {tint !== "none" && (
          <div className="space-y-2 rounded-lg border border-border bg-surface/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={tintOpacityId}
                className="text-xs font-medium text-foreground"
              >
                Tint intensity
              </label>
              <Badge variant="secondary" className="font-mono text-xs">
                {tintOpacity}%
              </Badge>
            </div>
            <input
              id={tintOpacityId}
              type="range"
              min={8}
              max={30}
              step={2}
              value={tintOpacity}
              aria-valuetext={`${tintOpacity} percent tint intensity`}
              onChange={(e) =>
                updateDisplayComfort({ tintOpacity: Number(e.target.value) })
              }
              className="a11y-range"
            />
          </div>
        )}
      </fieldset>
    </div>
  );
}
