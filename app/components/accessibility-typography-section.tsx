"use client";

import {
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  Check,
  ChevronDown,
  Laptop,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { useAccessibility } from "@/app/lib/accessibility-context";
import { resetPaneSettings } from "@/app/lib/a11y-catalog";
import { BionicText } from "@/app/components/bionic-text";
import {
  COMMON_SYSTEM_FONTS,
  FONT_OPTIONS,
  READING_WIDTH_OPTIONS,
  WCAG_COMFORT_SPACING,
  buildCustomFontStack,
  sanitizeFontName,
} from "@/app/lib/a11y-typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface LocalFontData {
  family: string;
}

type WindowWithLocalFonts = Window & {
  queryLocalFonts?: () => Promise<LocalFontData[]>;
};

export function AccessibilityTypographySection({
  activeCount,
}: {
  activeCount: number;
}) {
  const { settings, updateTypography, updateReadingAids, replaceSettings } =
    useAccessibility();
  const t = settings.typography;
  const bionicReading = settings.readingAids.bionicReading;

  const scaleId = useId();
  const lineId = useId();
  const letterId = useId();
  const wordId = useId();
  const paraId = useId();
  const dropdownListId = useId();
  const fontSearchId = useId();
  const customInputId = useId();
  const bionicToggleId = useId();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const [customDraft, setCustomDraft] = useState("");
  const [installedFonts, setInstalledFonts] = useState<string[] | null>(null);
  const [localFontError, setLocalFontError] = useState<string | null>(null);
  const [loadingLocalFonts, setLoadingLocalFonts] = useState(false);

  const supportsLocalFontApi = useSyncExternalStore(
    () => () => {},
    () =>
      typeof (window as WindowWithLocalFonts).queryLocalFonts === "function",
    () => false
  );

  const isCustomActive = t.fontFamily === "custom" && Boolean(t.customFontName);

  const activeFontLabel = isCustomActive
    ? `${t.customFontName} (System)`
    : (FONT_OPTIONS.find((f) => f.id === t.fontFamily)?.name ??
      FONT_OPTIONS[0].name);

  const activeCssFamily = isCustomActive
    ? buildCustomFontStack(t.customFontName)
    : (FONT_OPTIONS.find((f) => f.id === t.fontFamily)?.cssFamily ??
      FONT_OPTIONS[0].cssFamily);

  const selectSystemFont = (rawName: string) => {
    const safe = sanitizeFontName(rawName);
    if (!safe) return;
    updateTypography({ fontFamily: "custom", customFontName: safe });
    setCustomDraft("");
    setDropdownOpen(false);
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    selectSystemFont(customDraft);
  };

  const handleLoadDeviceFonts = async () => {
    const queryLocalFonts = (window as WindowWithLocalFonts).queryLocalFonts;
    if (!queryLocalFonts) return;
    setLoadingLocalFonts(true);
    setLocalFontError(null);
    try {
      const fonts = await queryLocalFonts();
      const unique = Array.from(
        new Set(
          fonts
            .map((f) => sanitizeFontName(f.family))
            .filter((name) => name.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b));
      setInstalledFonts(unique);
    } catch {
      setLocalFontError(
        "Font access permission was declined—use a common font below or enter any installed font name."
      );
    } finally {
      setLoadingLocalFonts(false);
    }
  };

  const availableSystemFonts = useMemo(() => {
    const source: readonly string[] = installedFonts ?? COMMON_SYSTEM_FONTS;
    const q = fontSearch.trim().toLowerCase();
    if (!q) return source.slice(0, 80);
    return source
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 80);
  }, [installedFonts, fontSearch]);

  return (
    <div className="space-y-6">
      {/* Live Character & Spacing Preview */}
      <div className="rounded-xl border border-border bg-surface/50 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Live Reading Preview · {activeFontLabel}
          </span>
          {activeCount > 0 && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => {
                setDropdownOpen(false);
                replaceSettings((prev) => resetPaneSettings(prev, "text"));
              }}
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              <span>Reset text &amp; reading</span>
            </Button>
          )}
        </div>
        <div
          className="rounded-lg border border-border bg-background p-3.5 text-foreground"
          style={{
            fontFamily: activeCssFamily,
            lineHeight: t.lineHeight,
            letterSpacing: `${t.letterSpacing}em`,
            wordSpacing: `${t.wordSpacing}em`,
          }}
        >
          <p className="text-sm font-medium">
            <BionicText text="The quick brown fox reads 0O Il1 clearly — 1234567890" />
          </p>
          <p
            className="text-xs text-muted-foreground"
            style={{ marginTop: `${t.paragraphSpacing * 0.6}em` }}
          >
            <BionicText text="Shy Notes adapts course content to your preferred typeface, spacing, and reading width across every page." />
          </p>
        </div>
      </div>

      {/* 1. Typefaces (Built-in Cards + Matching System Font Dropdown Card) */}
      <fieldset className="space-y-3">
        <div>
          <legend className="text-sm font-semibold text-foreground">
            Typeface
          </legend>
          <p className="text-xs text-muted-foreground">
            Pick a built-in accessible font or choose one installed on your
            device.
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {FONT_OPTIONS.map((font) => {
            const selected = t.fontFamily === font.id;
            return (
              <button
                key={font.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setDropdownOpen(false);
                  updateTypography({ fontFamily: font.id });
                }}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary bg-accent ring-1 ring-primary"
                    : "border-border bg-background hover:bg-surface/70"
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span
                    className="text-sm font-semibold text-foreground"
                    style={{ fontFamily: font.cssFamily }}
                  >
                    {font.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {font.badge && (
                      <Badge
                        variant="secondary"
                        className="h-4 px-1.5 text-[10px]"
                      >
                        {font.badge}
                      </Badge>
                    )}
                    {selected && (
                      <Check
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
                <p
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: font.cssFamily }}
                >
                  Aa Bb Cc · 0O Il1
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {font.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* System / Installed Font Dropdown Card (matches built-in card styling) */}
        <div className="space-y-2">
          <button
            type="button"
            aria-expanded={dropdownOpen}
            aria-controls={dropdownListId}
            onClick={() => setDropdownOpen((open) => !open)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isCustomActive
                ? "border-primary bg-accent ring-1 ring-primary"
                : "border-border bg-background hover:bg-surface/70"
            )}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Laptop
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span
                  className="truncate text-sm font-semibold text-foreground"
                  style={
                    isCustomActive
                      ? { fontFamily: buildCustomFontStack(t.customFontName) }
                      : undefined
                  }
                >
                  {isCustomActive ? t.customFontName : "System / Installed Font"}
                </span>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  Device
                </Badge>
              </div>
              <p
                className="text-xs text-muted-foreground"
                style={
                  isCustomActive
                    ? { fontFamily: buildCustomFontStack(t.customFontName) }
                    : undefined
                }
              >
                {isCustomActive
                  ? "Aa Bb Cc · 0O Il1 — Click to switch installed font"
                  : "Choose a font already installed on your computer"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {isCustomActive && (
                <Check className="size-4 text-primary" aria-hidden="true" />
              )}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  dropdownOpen && "rotate-180"
                )}
              />
            </div>
          </button>

          {dropdownOpen && (
            <div
              id={dropdownListId}
              className="space-y-2.5 rounded-xl border border-border bg-background p-3 shadow-md"
            >
              {/* Search + Optional Device Font Loader */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-44 flex-1">
                  <label htmlFor={fontSearchId} className="sr-only">
                    Search system fonts
                  </label>
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id={fontSearchId}
                    type="search"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder={
                      installedFonts
                        ? `Search ${installedFonts.length} device fonts…`
                        : "Filter system fonts…"
                    }
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                {supportsLocalFontApi && (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={loadingLocalFonts}
                    onClick={handleLoadDeviceFonts}
                  >
                    {loadingLocalFonts
                      ? "Loading…"
                      : installedFonts
                        ? `Reload (${installedFonts.length})`
                        : "Load all device fonts"}
                  </Button>
                )}
              </div>

              {localFontError && (
                <p role="status" className="text-[11px] text-muted-foreground">
                  {localFontError}
                </p>
              )}

              {/* Scrollable Font Option List */}
              <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1">
                {availableSystemFonts.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    No listed font matches &ldquo;{fontSearch}&rdquo;. Enter it
                    below to apply it directly.
                  </p>
                ) : (
                  availableSystemFonts.map((fontName) => {
                    const active =
                      isCustomActive &&
                      t.customFontName.toLowerCase() === fontName.toLowerCase();
                    return (
                      <button
                        key={fontName}
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectSystemFont(fontName)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                          active
                            ? "bg-accent font-medium text-accent-foreground ring-1 ring-border"
                            : "text-foreground hover:bg-muted/70"
                        )}
                      >
                        <span
                          className="truncate text-sm"
                          style={{ fontFamily: buildCustomFontStack(fontName) }}
                        >
                          {fontName}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className="hidden text-xs text-muted-foreground sm:inline"
                            style={{
                              fontFamily: buildCustomFontStack(fontName),
                            }}
                          >
                            Aa Bb 0O Il1
                          </span>
                          {active && (
                            <Check
                              className="size-3.5 text-primary"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Compact custom name fallback for fonts not listed (e.g. Safari/Firefox) */}
              <form
                onSubmit={handleCustomSubmit}
                className="flex items-center gap-2 border-t border-border pt-2.5"
              >
                <label htmlFor={customInputId} className="sr-only">
                  Enter another installed font name
                </label>
                <Input
                  id={customInputId}
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  placeholder="Other installed font name (e.g. Dyslexie)…"
                  className="h-8 text-xs"
                />
                <Button
                  type="submit"
                  size="xs"
                  disabled={!sanitizeFontName(customDraft)}
                >
                  Apply
                </Button>
              </form>
            </div>
          )}
        </div>
      </fieldset>

      <Separator />

      {/* 2. Reading Text Size */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label
              htmlFor={scaleId}
              className="text-sm font-semibold text-foreground"
            >
              Reading Text Size
            </label>
            <p className="text-xs text-muted-foreground">
              Enlarges course notes and reading copy independently without
              resizing navigation chrome.
            </p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {t.textScale}%
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={t.textScale <= 85}
            aria-label="Decrease reading text size"
            onClick={() =>
              updateTypography({ textScale: Math.max(85, t.textScale - 5) })
            }
          >
            A−
          </Button>
          <input
            id={scaleId}
            type="range"
            min={85}
            max={160}
            step={5}
            value={t.textScale}
            aria-valuetext={`${t.textScale} percent reading text size`}
            onChange={(e) =>
              updateTypography({ textScale: Number(e.target.value) })
            }
            className="a11y-range"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={t.textScale >= 160}
            aria-label="Increase reading text size"
            onClick={() =>
              updateTypography({ textScale: Math.min(160, t.textScale + 5) })
            }
          >
            A+
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[90, 100, 115, 130, 150].map((pct) => (
            <Button
              key={pct}
              type="button"
              size="xs"
              variant={t.textScale === pct ? "default" : "outline"}
              aria-pressed={t.textScale === pct}
              onClick={() => updateTypography({ textScale: pct })}
            >
              {pct === 100 ? "100% (Default)" : `${pct}%`}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* 3. Spacing Controls (WCAG 1.4.12) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Text &amp; Paragraph Spacing
            </h3>
            <p className="text-xs text-muted-foreground">
              Adjust breathing room between lines, letters, words, and
              paragraphs.
            </p>
          </div>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => updateTypography(WCAG_COMFORT_SPACING)}
          >
            <Sparkles className="size-3" aria-hidden="true" />
            <span>Comfortable spacing preset</span>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Line Height */}
          <div className="space-y-1.5 rounded-lg border border-border bg-surface/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor={lineId} className="font-medium text-foreground">
                Line height
              </label>
              <span className="font-mono text-muted-foreground">
                {t.lineHeight.toFixed(2)}×
              </span>
            </div>
            <input
              id={lineId}
              type="range"
              min={1.4}
              max={2.2}
              step={0.05}
              value={t.lineHeight}
              aria-valuetext={`${t.lineHeight.toFixed(2)} times font size`}
              onChange={(e) =>
                updateTypography({ lineHeight: Number(e.target.value) })
              }
              className="a11y-range"
            />
          </div>

          {/* Letter Spacing */}
          <div className="space-y-1.5 rounded-lg border border-border bg-surface/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor={letterId} className="font-medium text-foreground">
                Letter spacing
              </label>
              <span className="font-mono text-muted-foreground">
                {t.letterSpacing === 0
                  ? "Default"
                  : `+${t.letterSpacing.toFixed(2)}em`}
              </span>
            </div>
            <input
              id={letterId}
              type="range"
              min={0}
              max={0.14}
              step={0.02}
              value={t.letterSpacing}
              aria-valuetext={
                t.letterSpacing === 0
                  ? "Default letter spacing"
                  : `Plus ${t.letterSpacing.toFixed(2)} em`
              }
              onChange={(e) =>
                updateTypography({ letterSpacing: Number(e.target.value) })
              }
              className="a11y-range"
            />
          </div>

          {/* Word Spacing */}
          <div className="space-y-1.5 rounded-lg border border-border bg-surface/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor={wordId} className="font-medium text-foreground">
                Word spacing
              </label>
              <span className="font-mono text-muted-foreground">
                {t.wordSpacing === 0
                  ? "Default"
                  : `+${t.wordSpacing.toFixed(2)}em`}
              </span>
            </div>
            <input
              id={wordId}
              type="range"
              min={0}
              max={0.2}
              step={0.02}
              value={t.wordSpacing}
              aria-valuetext={
                t.wordSpacing === 0
                  ? "Default word spacing"
                  : `Plus ${t.wordSpacing.toFixed(2)} em`
              }
              onChange={(e) =>
                updateTypography({ wordSpacing: Number(e.target.value) })
              }
              className="a11y-range"
            />
          </div>

          {/* Paragraph Spacing */}
          <div className="space-y-1.5 rounded-lg border border-border bg-surface/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor={paraId} className="font-medium text-foreground">
                Paragraph spacing
              </label>
              <span className="font-mono text-muted-foreground">
                {t.paragraphSpacing.toFixed(2)}em
              </span>
            </div>
            <input
              id={paraId}
              type="range"
              min={1}
              max={2.25}
              step={0.25}
              value={t.paragraphSpacing}
              aria-valuetext={`${t.paragraphSpacing.toFixed(2)} em`}
              onChange={(e) =>
                updateTypography({ paragraphSpacing: Number(e.target.value) })
              }
              className="a11y-range"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* 4. Reading Line Width (Measure) */}
      <fieldset className="space-y-3">
        <div>
          <legend className="text-sm font-semibold text-foreground">
            Course Reading Width
          </legend>
          <p className="text-xs text-muted-foreground">
            Shorter line lengths make it easier for your eyes to track from one
            line to the next.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {READING_WIDTH_OPTIONS.map((opt) => {
            const selected = t.readingWidth === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={selected}
                onClick={() => updateTypography({ readingWidth: opt.id })}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-xl border p-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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

      {/* 5. Cognitive & Dyslexia Text Polish */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Reading Flow &amp; Dyslexia Polish
          </h3>
          <p className="text-xs text-muted-foreground">
            Add word fixation anchors, simplify letterforms, and highlight page
            structure.
          </p>
        </div>

        {/* Guided Word Anchors (Bionic Reading) */}
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface/40 p-3.5">
          <label
            htmlFor={bionicToggleId}
            className="flex-1 cursor-pointer space-y-1"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span>Guided Word Anchors (Bionic Reading)</span>
              {bionicReading && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  On
                </Badge>
              )}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Bolds leading letters in course notes (
              <strong className="font-semibold text-foreground">Sh</strong>y{" "}
              <strong className="font-semibold text-foreground">No</strong>tes{" "}
              <strong className="font-semibold text-foreground">rea</strong>ding)
              while keeping screen-reader speech intact.
            </span>
          </label>
          <input
            id={bionicToggleId}
            type="checkbox"
            checked={bionicReading}
            onChange={(e) =>
              updateReadingAids({ bionicReading: e.target.checked })
            }
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary"
          />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {(
            [
              {
                key: "noItalics",
                title: "Remove italics",
                note: "Render italic text upright & semibold",
              },
              {
                key: "noAllCaps",
                title: "Disable all-caps",
                note: "Preserve natural word shapes on labels",
              },
              {
                key: "leftAlignText",
                title: "Left-align reading text",
                note: "Prevent uneven gaps in prose blocks",
              },
              {
                key: "highlightHeadings",
                title: "Highlight headings",
                note: "Add left accent bars to section titles",
              },
            ] as const
          ).map((item) => {
            const checked = t[item.key];
            const id = `${scaleId}-${item.key}`;
            return (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3"
              >
                <label
                  htmlFor={id}
                  className="flex-1 cursor-pointer space-y-0.5"
                >
                  <span className="block text-xs font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">
                    {item.note}
                  </span>
                </label>
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    updateTypography({ [item.key]: e.target.checked })
                  }
                  className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
