export type A11yThemeId =
  | "system"
  | "light"
  | "dark"
  | "paper"
  | "soft-gray"
  | "high-contrast-light"
  | "high-contrast-dark"
  | "colorblind-safe";

export type CustomColorKey =
  | "background"
  | "surface"
  | "foreground"
  | "mutedForeground"
  | "primary"
  | "border";

export type SaturationLevel = 100 | 50 | 0;
export type TintPresetId = "none" | "amber" | "blue" | "rose" | "sage";
export type FocusHighlightMode = "default" | "always" | "high-contrast";
export type MediaMode = "normal" | "dim" | "hide";

export interface DisplayComfortSettings {
  uiScale: number; // 85 to 140 (%)
  brightness: number; // 60 to 100
  saturation: SaturationLevel;
  tint: TintPresetId;
  tintOpacity: number; // 8 to 30 (percent)
  reduceTransparency: boolean;
  strongBoundaries: boolean;
  underlineLinks: boolean;
  reduceMotion: boolean;
  largeTargets: boolean;
  focusHighlight: FocusHighlightMode;
  distractionFree: boolean;
  keyboardShortcuts: boolean;
  disableSingleKeyShortcuts: boolean;
  mediaMode: MediaMode;
  pauseMedia: boolean;
}

export const DEFAULT_COMFORT_SETTINGS: DisplayComfortSettings = {
  uiScale: 100,
  brightness: 100,
  saturation: 100,
  tint: "none",
  tintOpacity: 16,
  reduceTransparency: false,
  strongBoundaries: false,
  underlineLinks: false,
  reduceMotion: false,
  largeTargets: false,
  focusHighlight: "default",
  distractionFree: false,
  keyboardShortcuts: true,
  disableSingleKeyShortcuts: false,
  mediaMode: "normal",
  pauseMedia: false,
};

export const TINT_PRESETS: {
  id: TintPresetId;
  label: string;
  description: string;
  hex: string | null;
}[] = [
  { id: "none", label: "None", description: "No color overlay", hex: null },
  {
    id: "amber",
    label: "Warm Amber",
    description: "Softens blue light & glare",
    hex: "#f59e0b",
  },
  {
    id: "blue",
    label: "Cool Blue",
    description: "Calm low-glare reading veil",
    hex: "#3b82f6",
  },
  {
    id: "rose",
    label: "Soft Rose",
    description: "Popular visual-stress tint",
    hex: "#f43f5e",
  },
  {
    id: "sage",
    label: "Soft Sage",
    description: "Gentle green contrast filter",
    hex: "#10b981",
  },
];

export function applyComfortFlagsToDocument(comfort: DisplayComfortSettings) {
  const root = document.documentElement;
  const toggleAttr = (attr: string, active: boolean) => {
    if (active) {
      root.setAttribute(attr, "true");
    } else {
      root.removeAttribute(attr);
    }
  };

  if (comfort.uiScale === 100) {
    root.style.removeProperty("font-size");
  } else {
    root.style.setProperty("font-size", `${comfort.uiScale}%`);
  }

  toggleAttr("data-a11y-reduce-transparency", comfort.reduceTransparency);
  toggleAttr("data-a11y-strong-boundaries", comfort.strongBoundaries);
  toggleAttr("data-a11y-underline-links", comfort.underlineLinks);
  toggleAttr("data-a11y-reduce-motion", comfort.reduceMotion);
  toggleAttr("data-a11y-large-targets", comfort.largeTargets);
  toggleAttr("data-a11y-distraction-free", comfort.distractionFree);
  toggleAttr("data-a11y-no-single-key", comfort.disableSingleKeyShortcuts);
  toggleAttr("data-a11y-pause-media", comfort.pauseMedia);

  if (comfort.focusHighlight === "default") {
    root.removeAttribute("data-a11y-focus");
  } else {
    root.setAttribute("data-a11y-focus", comfort.focusHighlight);
  }

  if (comfort.mediaMode === "normal") {
    root.removeAttribute("data-a11y-media");
  } else {
    root.setAttribute("data-a11y-media", comfort.mediaMode);
  }
}

export interface ThemeColors {
  background: string;
  surface: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  border: string;
}

export interface A11yThemeDefinition {
  id: A11yThemeId;
  name: string;
  description: string;
  scheme: "system" | "light" | "dark";
  badge?: string;
  /** Preview & resolved base colors (for "system", uses light/dark depending on OS) */
  colors: ThemeColors;
}

export const LIGHT_BASE_COLORS: ThemeColors = {
  background: "#ffffff",
  surface: "#f4f4f5",
  foreground: "#171717",
  mutedForeground: "#52525b",
  primary: "#18181b",
  border: "#e4e4e7",
};

export const DARK_BASE_COLORS: ThemeColors = {
  background: "#121215",
  surface: "#1c1c21",
  foreground: "#f4f4f5",
  mutedForeground: "#a1a1aa",
  primary: "#f4f4f5",
  border: "#2e2e36",
};

export const A11Y_THEMES: A11yThemeDefinition[] = [
  {
    id: "system",
    name: "Match OS",
    description: "Follows your device light or dark preference",
    scheme: "system",
    colors: LIGHT_BASE_COLORS,
  },
  {
    id: "light",
    name: "Light",
    description: "Clean, high-clarity bright surfaces",
    scheme: "light",
    colors: LIGHT_BASE_COLORS,
  },
  {
    id: "dark",
    name: "Dark",
    description: "Calm low-glare dark workspace",
    scheme: "dark",
    colors: DARK_BASE_COLORS,
  },
  {
    id: "paper",
    name: "Warm Paper",
    description: "Soft sepia cream to reduce eye strain",
    scheme: "light",
    badge: "Low glare",
    colors: {
      background: "#f6eedc",
      surface: "#ede1c7",
      foreground: "#2b2117",
      mutedForeground: "#5c4a38",
      primary: "#0f5c4e",
      border: "#d5c3a1",
    },
  },
  {
    id: "soft-gray",
    name: "Soft Neutral",
    description: "Muted stone canvas for light sensitivity",
    scheme: "light",
    badge: "Gentle",
    colors: {
      background: "#eceef0",
      surface: "#e1e4e8",
      foreground: "#1e2329",
      mutedForeground: "#4b5563",
      primary: "#254e7a",
      border: "#c8cfd8",
    },
  },
  {
    id: "high-contrast-light",
    name: "High Contrast Light",
    description: "Maximum contrast black on pure white",
    scheme: "light",
    badge: "AAA",
    colors: {
      background: "#ffffff",
      surface: "#f2f2f2",
      foreground: "#000000",
      mutedForeground: "#1a1a1a",
      primary: "#003d99",
      border: "#000000",
    },
  },
  {
    id: "high-contrast-dark",
    name: "High Contrast Dark",
    description: "Pure black canvas with crisp white & yellow",
    scheme: "dark",
    badge: "AAA",
    colors: {
      background: "#000000",
      surface: "#121212",
      foreground: "#ffffff",
      mutedForeground: "#e5e5e5",
      primary: "#ffe066",
      border: "#ffffff",
    },
  },
  {
    id: "colorblind-safe",
    name: "Colorblind-Safe",
    description: "Okabe–Ito high-distinction blue accent",
    scheme: "light",
    badge: "Okabe–Ito",
    colors: {
      background: "#fafaf8",
      surface: "#f0f2f5",
      foreground: "#14191f",
      mutedForeground: "#475467",
      primary: "#005ab5",
      border: "#cbd5e1",
    },
  },
];

export const COLOR_TOKEN_META: {
  key: CustomColorKey;
  label: string;
  description: string;
}[] = [
  {
    key: "background",
    label: "Page background",
    description: "Main canvas behind content",
  },
  {
    key: "surface",
    label: "Cards & sidebars",
    description: "Elevated panels, cards, and navigation",
  },
  {
    key: "foreground",
    label: "Primary text",
    description: "Headings and body copy",
  },
  {
    key: "mutedForeground",
    label: "Secondary text",
    description: "Descriptions, labels, and timestamps",
  },
  {
    key: "primary",
    label: "Primary / accent",
    description: "Buttons, active highlights, and progress bars",
  },
  {
    key: "border",
    label: "Borders & dividers",
    description: "Card outlines, inputs, and section lines",
  },
];

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const r = withHash[1];
    const g = withHash[2];
    const b = withHash[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes the WCAG 2.1 contrast ratio between two 6-digit hex colors (1 to 21).
 */
export function getContrastRatio(hexA: string, hexB: string): number {
  if (!isValidHexColor(hexA) || !isValidHexColor(hexB)) return 1;
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks #ffffff or #000000 for maximum contrast against a given hex background.
 */
export function getAccessibleForeground(bgHex: string): string {
  if (!isValidHexColor(bgHex)) return "#ffffff";
  const whiteContrast = getContrastRatio(bgHex, "#ffffff");
  const blackContrast = getContrastRatio(bgHex, "#000000");
  return whiteContrast >= blackContrast ? "#ffffff" : "#000000";
}

export function resolveThemeColors(
  themeId: A11yThemeId,
  systemScheme: "light" | "dark",
  customColors: Partial<Record<CustomColorKey, string>> = {}
): { scheme: "light" | "dark"; colors: ThemeColors } {
  let scheme: "light" | "dark";
  let base: ThemeColors;

  if (themeId === "system") {
    scheme = systemScheme;
    base = systemScheme === "dark" ? DARK_BASE_COLORS : LIGHT_BASE_COLORS;
  } else {
    const found =
      A11Y_THEMES.find((t) => t.id === themeId) ?? A11Y_THEMES[1];
    scheme = found.scheme === "dark" ? "dark" : "light";
    base = found.colors;
  }

  const merged: ThemeColors = {
    background: isValidHexColor(customColors.background ?? "")
      ? customColors.background!
      : base.background,
    surface: isValidHexColor(customColors.surface ?? "")
      ? customColors.surface!
      : base.surface,
    foreground: isValidHexColor(customColors.foreground ?? "")
      ? customColors.foreground!
      : base.foreground,
    mutedForeground: isValidHexColor(customColors.mutedForeground ?? "")
      ? customColors.mutedForeground!
      : base.mutedForeground,
    primary: isValidHexColor(customColors.primary ?? "")
      ? customColors.primary!
      : base.primary,
    border: isValidHexColor(customColors.border ?? "")
      ? customColors.border!
      : base.border,
  };

  // If user manually set a dark/light background, infer effective scheme for native UI
  if (customColors.background && isValidHexColor(customColors.background)) {
    scheme = relativeLuminance(customColors.background) < 0.25 ? "dark" : "light";
  }

  return { scheme, colors: merged };
}

const MANAGED_CSS_VARS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--surface",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--secondary",
  "--secondary-foreground",
  "--primary",
  "--primary-foreground",
  "--border",
  "--input",
  "--ring",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-border",
] as const;

/**
 * Applies the selected theme and any manual color overrides onto `:root`
 * and `<meta name="color-scheme">`.
 */
export function applyDisplayToDocument(
  themeId: A11yThemeId,
  customColors: Partial<Record<CustomColorKey, string>>,
  systemScheme: "light" | "dark"
) {
  const root = document.documentElement;
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]'
  );
  const hasCustomColors = Object.values(customColors).some(
    (v) => typeof v === "string" && isValidHexColor(v)
  );

  // Clean slate when back on unmodified "Match OS" so native CSS handles everything
  if (themeId === "system" && !hasCustomColors) {
    if (meta) meta.content = "light dark";
    root.removeAttribute("data-a11y-theme");
    root.classList.toggle("dark", systemScheme === "dark");
    for (const v of MANAGED_CSS_VARS) {
      root.style.removeProperty(v);
    }
    return;
  }

  const { scheme, colors } = resolveThemeColors(
    themeId,
    systemScheme,
    customColors
  );
  const primaryFg = getAccessibleForeground(colors.primary);

  if (meta) {
    meta.content = themeId === "system" && !hasCustomColors ? "light dark" : scheme;
  }
  root.setAttribute("data-a11y-theme", themeId);
  root.classList.toggle("dark", scheme === "dark");

  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--foreground", colors.foreground);
  root.style.setProperty("--card", colors.background);
  root.style.setProperty("--card-foreground", colors.foreground);
  root.style.setProperty("--popover", colors.background);
  root.style.setProperty("--popover-foreground", colors.foreground);
  root.style.setProperty("--surface", colors.surface);
  root.style.setProperty("--muted", colors.surface);
  root.style.setProperty("--muted-foreground", colors.mutedForeground);
  root.style.setProperty("--accent", colors.surface);
  root.style.setProperty("--accent-foreground", colors.foreground);
  root.style.setProperty("--secondary", colors.surface);
  root.style.setProperty("--secondary-foreground", colors.foreground);
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--primary-foreground", primaryFg);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--input", colors.border);
  root.style.setProperty("--ring", colors.primary);
  root.style.setProperty("--sidebar", colors.surface);
  root.style.setProperty("--sidebar-foreground", colors.foreground);
  root.style.setProperty("--sidebar-border", colors.border);
}
