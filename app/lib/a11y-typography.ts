export type FontFamilyId =
  | "default"
  | "atkinson"
  | "lexend"
  | "opendyslexic"
  | "literata"
  | "mono"
  | "custom";

export type ReadingWidthId = "narrow" | "standard" | "wide" | "full";

export interface TypographySettings {
  fontFamily: FontFamilyId;
  customFontName: string; // Sanitized local/system font family name when fontFamily === "custom"
  textScale: number; // 85 to 160 (%) — scales reading text independently
  lineHeight: number; // 1.4 to 2.2 (unitless)
  letterSpacing: number; // 0 to 0.14 (em)
  wordSpacing: number; // 0 to 0.20 (em)
  paragraphSpacing: number; // 1 to 2.25 (em)
  readingWidth: ReadingWidthId;
  noItalics: boolean;
  noAllCaps: boolean;
  leftAlignText: boolean;
  highlightHeadings: boolean;
}

export const DEFAULT_TYPOGRAPHY_SETTINGS: TypographySettings = {
  fontFamily: "default",
  customFontName: "",
  textScale: 100,
  lineHeight: 1.6,
  letterSpacing: 0,
  wordSpacing: 0,
  paragraphSpacing: 1,
  readingWidth: "full",
  noItalics: false,
  noAllCaps: false,
  leftAlignText: false,
  highlightHeadings: false,
};

export const COMMON_SYSTEM_FONTS = [
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Helvetica Neue",
  "Arial",
  "Georgia",
  "Palatino",
  "Comic Sans MS",
  "Courier New",
  "system-ui",
] as const;

/**
 * Strips characters that could break out of a CSS font-family quoted string.
 */
export function sanitizeFontName(raw: string): string {
  return raw
    .replace(/["'\\;{}()<>`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function buildCustomFontStack(rawName: string): string {
  const safe = sanitizeFontName(rawName);
  if (!safe) return "var(--font-geist-sans), system-ui, sans-serif";
  if (safe.toLowerCase() === "system-ui") {
    return "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  }
  return `"${safe}", system-ui, sans-serif`;
}

export const WCAG_COMFORT_SPACING: Pick<
  TypographySettings,
  "lineHeight" | "letterSpacing" | "wordSpacing" | "paragraphSpacing"
> = {
  lineHeight: 1.8,
  letterSpacing: 0.08,
  wordSpacing: 0.14,
  paragraphSpacing: 1.75,
};

export interface FontOption {
  id: FontFamilyId;
  name: string;
  description: string;
  badge?: string;
  cssFamily: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "default",
    name: "Geist (Default)",
    description: "Clean modern geometric sans-serif",
    cssFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  {
    id: "atkinson",
    name: "Atkinson Hyperlegible",
    description: "Braille Institute font with unmistakable 0/O and I/l/1",
    badge: "Low vision",
    cssFamily: "var(--font-atkinson), system-ui, sans-serif",
  },
  {
    id: "lexend",
    name: "Lexend",
    description: "Engineered to reduce visual crowding and improve fluency",
    badge: "Fluency",
    cssFamily: "var(--font-lexend), system-ui, sans-serif",
  },
  {
    id: "opendyslexic",
    name: "OpenDyslexic",
    description: "Heavy-bottomed letterforms designed to prevent letter flipping",
    badge: "Dyslexia",
    cssFamily: "'OpenDyslexic', system-ui, sans-serif",
  },
  {
    id: "literata",
    name: "Literata Serif",
    description: "Warm digital-book serif built for long study sessions",
    badge: "Long-form",
    cssFamily: "var(--font-literata), Georgia, serif",
  },
  {
    id: "mono",
    name: "JetBrains Mono",
    description: "High-legibility fixed-width typeface with distinct 0/O and I/l/1",
    badge: "Monospace",
    cssFamily: "var(--font-jetbrains-mono), var(--font-geist-mono), monospace",
  },
];

export const READING_WIDTH_OPTIONS: {
  id: ReadingWidthId;
  label: string;
  measure: string;
  note: string;
}[] = [
  { id: "narrow", label: "Narrow", measure: "52ch", note: "~52 chars" },
  { id: "standard", label: "Standard", measure: "68ch", note: "~68 chars" },
  { id: "wide", label: "Wide", measure: "85ch", note: "~85 chars" },
  { id: "full", label: "Full", measure: "100%", note: "Unconstrained" },
];

const VALID_FONT_IDS = new Set<string>([
  ...FONT_OPTIONS.map((f) => f.id),
  "custom",
]);
const VALID_WIDTH_IDS = new Set<string>(READING_WIDTH_OPTIONS.map((w) => w.id));

export function sanitizeTypography(raw: unknown): TypographySettings {
  if (!raw || typeof raw !== "object") return DEFAULT_TYPOGRAPHY_SETTINGS;
  const t = raw as Partial<TypographySettings>;

  const customFontName =
    typeof t.customFontName === "string"
      ? sanitizeFontName(t.customFontName)
      : "";

  let fontFamily: FontFamilyId =
    typeof t.fontFamily === "string" && VALID_FONT_IDS.has(t.fontFamily)
      ? (t.fontFamily as FontFamilyId)
      : "default";

  if (fontFamily === "custom" && !customFontName) {
    fontFamily = "default";
  }

  const textScale =
    typeof t.textScale === "number" && t.textScale >= 85 && t.textScale <= 160
      ? Math.round(t.textScale / 5) * 5
      : 100;

  const lineHeight =
    typeof t.lineHeight === "number" &&
    t.lineHeight >= 1.4 &&
    t.lineHeight <= 2.2
      ? Math.round(t.lineHeight * 20) / 20
      : 1.6;

  const letterSpacing =
    typeof t.letterSpacing === "number" &&
    t.letterSpacing >= 0 &&
    t.letterSpacing <= 0.14
      ? Math.round(t.letterSpacing * 100) / 100
      : 0;

  const wordSpacing =
    typeof t.wordSpacing === "number" &&
    t.wordSpacing >= 0 &&
    t.wordSpacing <= 0.2
      ? Math.round(t.wordSpacing * 100) / 100
      : 0;

  const paragraphSpacing =
    typeof t.paragraphSpacing === "number" &&
    t.paragraphSpacing >= 1 &&
    t.paragraphSpacing <= 2.25
      ? Math.round(t.paragraphSpacing * 4) / 4
      : 1;

  const readingWidth: ReadingWidthId =
    typeof t.readingWidth === "string" && VALID_WIDTH_IDS.has(t.readingWidth)
      ? (t.readingWidth as ReadingWidthId)
      : "full";

  return {
    fontFamily,
    customFontName,
    textScale,
    lineHeight,
    letterSpacing,
    wordSpacing,
    paragraphSpacing,
    readingWidth,
    noItalics: Boolean(t.noItalics),
    noAllCaps: Boolean(t.noAllCaps),
    leftAlignText: Boolean(t.leftAlignText),
    highlightHeadings: Boolean(t.highlightHeadings),
  };
}

export function isDefaultTypography(t: TypographySettings): boolean {
  return (
    t.fontFamily === DEFAULT_TYPOGRAPHY_SETTINGS.fontFamily &&
    t.customFontName === DEFAULT_TYPOGRAPHY_SETTINGS.customFontName &&
    t.textScale === DEFAULT_TYPOGRAPHY_SETTINGS.textScale &&
    t.lineHeight === DEFAULT_TYPOGRAPHY_SETTINGS.lineHeight &&
    t.letterSpacing === DEFAULT_TYPOGRAPHY_SETTINGS.letterSpacing &&
    t.wordSpacing === DEFAULT_TYPOGRAPHY_SETTINGS.wordSpacing &&
    t.paragraphSpacing === DEFAULT_TYPOGRAPHY_SETTINGS.paragraphSpacing &&
    t.readingWidth === DEFAULT_TYPOGRAPHY_SETTINGS.readingWidth &&
    t.noItalics === DEFAULT_TYPOGRAPHY_SETTINGS.noItalics &&
    t.noAllCaps === DEFAULT_TYPOGRAPHY_SETTINGS.noAllCaps &&
    t.leftAlignText === DEFAULT_TYPOGRAPHY_SETTINGS.leftAlignText &&
    t.highlightHeadings === DEFAULT_TYPOGRAPHY_SETTINGS.highlightHeadings
  );
}

/**
 * Applies typography custom properties onto `:root` (reading font, scale, spacing, width).
 */
export function applyTypographyToDocument(typo: TypographySettings) {
  const root = document.documentElement;
  const fontOpt =
    FONT_OPTIONS.find((f) => f.id === typo.fontFamily) ?? FONT_OPTIONS[0];
  const widthOpt =
    READING_WIDTH_OPTIONS.find((w) => w.id === typo.readingWidth) ??
    READING_WIDTH_OPTIONS[1];

  if (typo.fontFamily === "default") {
    root.style.removeProperty("--a11y-font-family");
  } else if (typo.fontFamily === "custom" && typo.customFontName) {
    root.style.setProperty(
      "--a11y-font-family",
      buildCustomFontStack(typo.customFontName)
    );
  } else {
    root.style.setProperty("--a11y-font-family", fontOpt.cssFamily);
  }

  if (typo.textScale === 100) {
    root.style.removeProperty("--a11y-text-scale");
  } else {
    root.style.setProperty("--a11y-text-scale", String(typo.textScale / 100));
  }

  if (typo.lineHeight === 1.6) {
    root.style.removeProperty("--a11y-line-height");
  } else {
    root.style.setProperty("--a11y-line-height", String(typo.lineHeight));
  }

  if (typo.letterSpacing === 0) {
    root.style.removeProperty("--a11y-letter-spacing");
  } else {
    root.style.setProperty("--a11y-letter-spacing", `${typo.letterSpacing}em`);
  }

  if (typo.wordSpacing === 0) {
    root.style.removeProperty("--a11y-word-spacing");
  } else {
    root.style.setProperty("--a11y-word-spacing", `${typo.wordSpacing}em`);
  }

  if (typo.paragraphSpacing === 1) {
    root.style.removeProperty("--a11y-paragraph-spacing");
  } else {
    root.style.setProperty(
      "--a11y-paragraph-spacing",
      `${typo.paragraphSpacing}em`
    );
  }

  root.style.setProperty("--a11y-measure", widthOpt.measure);

  const toggleAttr = (attr: string, active: boolean) => {
    if (active) {
      root.setAttribute(attr, "true");
    } else {
      root.removeAttribute(attr);
    }
  };
  toggleAttr("data-a11y-no-italics", typo.noItalics);
  toggleAttr("data-a11y-no-all-caps", typo.noAllCaps);
  toggleAttr("data-a11y-left-align", typo.leftAlignText);
  toggleAttr("data-a11y-highlight-headings", typo.highlightHeadings);
}
