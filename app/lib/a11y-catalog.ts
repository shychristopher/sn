import type { AccessibilitySettings } from "@/app/lib/accessibility-context";
import { A11Y_THEMES, DEFAULT_COMFORT_SETTINGS, TINT_PRESETS } from "@/app/lib/a11y-themes";
import {
  DEFAULT_TYPOGRAPHY_SETTINGS,
  FONT_OPTIONS,
  READING_WIDTH_OPTIONS,
} from "@/app/lib/a11y-typography";
import { DEFAULT_READING_AIDS_SETTINGS } from "@/app/lib/a11y-reading-aids";

export type A11yPaneId =
  | "overview"
  | "color-light"
  | "text"
  | "focus"
  | "tools"
  | "navigation";

export interface ActiveAdjustmentChip {
  id: string;
  label: string;
  pane: A11yPaneId;
  clear: (s: AccessibilitySettings) => AccessibilitySettings;
}

export interface SearchableSettingItem {
  id: string;
  title: string;
  description: string;
  pane: A11yPaneId;
  paneLabel: string;
  keywords: string;
}

export const PANE_LABELS: Record<A11yPaneId, string> = {
  overview: "Quick Start",
  "color-light": "Color & Light",
  text: "Text & Reading",
  focus: "Focus & Motion",
  tools: "Reading Tools",
  navigation: "Navigation & Input",
};

export const SEARCHABLE_SETTINGS: SearchableSettingItem[] = [
  {
    id: "profiles",
    title: "Quick Accessibility Profiles",
    description: "One-click bundles for dyslexia, low vision, ADHD, migraines, motor, and voice control",
    pane: "overview",
    paneLabel: PANE_LABELS.overview,
    keywords: "preset profile bundle dyslexia low vision adhd migraine motor screen reader",
  },
  {
    id: "backup",
    title: "Export & Import Settings (JSON)",
    description: "Download, copy, or import your accessibility setup across devices",
    pane: "overview",
    paneLabel: PANE_LABELS.overview,
    keywords: "export import backup json transfer copy download",
  },
  {
    id: "theme",
    title: "Theme Presets",
    description: "Match OS, Light, Dark, Warm Paper, Soft Neutral, High Contrast, Colorblind-Safe",
    pane: "color-light",
    paneLabel: PANE_LABELS["color-light"],
    keywords: "theme dark mode light paper sepia high contrast colorblind okabe",
  },
  {
    id: "custom-colors",
    title: "Custom Color Palette",
    description: "Fine-tune background, surface, text, accent, and border hex colors with WCAG checks",
    pane: "color-light",
    paneLabel: PANE_LABELS["color-light"],
    keywords: "custom color hex palette contrast wcag background text accent",
  },
  {
    id: "brightness",
    title: "Screen Dimmer",
    description: "Lower harsh screen brightness (60%–100%) for glare or migraine relief",
    pane: "color-light",
    paneLabel: PANE_LABELS["color-light"],
    keywords: "dim dimmer brightness glare migraine photophobia dark",
  },
  {
    id: "saturation",
    title: "Color Saturation & Grayscale",
    description: "Reduce chroma to 50% muted or 0% monochrome grayscale",
    pane: "color-light",
    paneLabel: PANE_LABELS["color-light"],
    keywords: "saturation grayscale monochrome muted color intensity",
  },
  {
    id: "tint",
    title: "Color Tint Overlay",
    description: "Soft warm amber, cool blue, soft rose, or soft sage reading veil",
    pane: "color-light",
    paneLabel: PANE_LABELS["color-light"],
    keywords: "tint overlay irlen amber blue rose sage filter veil",
  },
  {
    id: "font",
    title: "Font Family & Installed System Fonts",
    description: "Geist, Atkinson Hyperlegible, Lexend, OpenDyslexic, Literata, JetBrains Mono, or OS fonts",
    pane: "text",
    paneLabel: PANE_LABELS.text,
    keywords: "font typeface atkinson lexend opendyslexic literata mono system installed local",
  },
  {
    id: "text-size",
    title: "Reading Text Size",
    description: "Scale course prose independently (85%–160%) without resizing chrome",
    pane: "text",
    paneLabel: PANE_LABELS.text,
    keywords: "text size font size zoom reading copy larger bigger smaller",
  },
  {
    id: "reading-width",
    title: "Course Reading Width",
    description: "Set line measure to Narrow (52ch), Standard (68ch), Wide (85ch), or Full",
    pane: "text",
    paneLabel: PANE_LABELS.text,
    keywords: "width measure line length narrow standard wide full column",
  },
  {
    id: "spacing",
    title: "Text Spacing (WCAG 1.4.12)",
    description: "Adjust line height, letter spacing, word spacing, and paragraph spacing",
    pane: "text",
    paneLabel: PANE_LABELS.text,
    keywords: "spacing line height letter word paragraph wcag 1.4.12 comfort",
  },
  {
    id: "bionic",
    title: "Guided Word Anchors (Bionic Reading)",
    description: "Bold leading letters of words while keeping screen-reader speech intact",
    pane: "text",
    paneLabel: PANE_LABELS.text,
    keywords: "bionic reading word anchors fixation bold leading letters",
  },
  {
    id: "dyslexia-polish",
    title: "Remove Italics, Disable All-Caps, Left-Align & Highlight Headings",
    description: "Simplify letterforms, prevent justified rivers, and mark section headings",
    pane: "text",
    paneLabel: PANE_LABELS.text,
    keywords: "italics slanted all caps uppercase left align headings dyslexia",
  },
  {
    id: "distraction-free",
    title: "Distraction-Free Study Mode",
    description: "Hide avatars and decorative chrome and softly fade top navigation bars",
    pane: "focus",
    paneLabel: PANE_LABELS.focus,
    keywords: "distraction free focus adhd zen calm quiet study mode chrome",
  },
  {
    id: "motion",
    title: "Reduce Motion & Pause Animations",
    description: "Disable transitions, smooth scrolling, autoplay media, and looping animations",
    pane: "focus",
    paneLabel: PANE_LABELS.focus,
    keywords: "motion animation transition vestibular autoplay pause video gif",
  },
  {
    id: "transparency",
    title: "Reduce Transparency",
    description: "Replace translucent blurred glass surfaces with solid opaque backgrounds",
    pane: "focus",
    paneLabel: PANE_LABELS.focus,
    keywords: "transparency blur glass opaque backdrop",
  },
  {
    id: "media",
    title: "Images & Media (Dim or Hide)",
    description: "Lower glare on images or hide visual media while preserving alt text",
    pane: "focus",
    paneLabel: PANE_LABELS.focus,
    keywords: "images photos media video hide dim glare visual noise",
  },
  {
    id: "reading-guide",
    title: "Reading Guide & Focus Mask",
    description: "Underline ruler or highlight band with optional outside dimming mask",
    pane: "tools",
    paneLabel: PANE_LABELS.tools,
    keywords: "reading guide ruler bar highlight band focus mask spotlight dim",
  },
  {
    id: "magnifier",
    title: "Live Text Magnifier",
    description: "Floating enlarged text strip following hovered or focused elements (1.5×–2.25×)",
    pane: "tools",
    paneLabel: PANE_LABELS.tools,
    keywords: "magnifier zoom loupe enlarge hover text low vision",
  },
  {
    id: "read-aloud",
    title: "Built-in Read Aloud (Text-to-Speech)",
    description: "Narrate course pages with speed, voice picker, active highlight, and click-to-read",
    pane: "tools",
    paneLabel: PANE_LABELS.tools,
    keywords: "read aloud speech tts voice audio listen narrate highlight selection",
  },
  {
    id: "ui-scale",
    title: "Interface (UI) Scale",
    description: "Scale navbar, sidebar, buttons, icons, and text together (85%–140%)",
    pane: "navigation",
    paneLabel: PANE_LABELS.navigation,
    keywords: "ui scale interface zoom size navbar buttons",
  },
  {
    id: "large-targets",
    title: "Larger Click & Tap Targets (44×44px)",
    description: "WCAG AAA minimum target floor for buttons, links, inputs, and checkboxes",
    pane: "navigation",
    paneLabel: PANE_LABELS.navigation,
    keywords: "targets tap click 44px motor tremor touch aaa buttons",
  },
  {
    id: "cursor",
    title: "High-Visibility Cursor",
    description: "Oversized dark or light pointer with a contrasting edge outline",
    pane: "navigation",
    paneLabel: PANE_LABELS.navigation,
    keywords: "cursor mouse pointer large dark light big",
  },
  {
    id: "focus-ring",
    title: "Focus Outline Visibility & Strong Borders",
    description: "Always-visible or high-contrast yellow/black double focus ring, reinforced borders, underlined links",
    pane: "navigation",
    paneLabel: PANE_LABELS.navigation,
    keywords: "focus ring outline border boundaries underline links keyboard tab",
  },
  {
    id: "shortcuts",
    title: "Keyboard Shortcuts & Voice Control Safety",
    description: "Toggle Alt+Shift+A/G/R shortcuts and disable single-key hotkeys (WCAG 2.1.4)",
    pane: "navigation",
    paneLabel: PANE_LABELS.navigation,
    keywords: "keyboard shortcuts hotkeys voice dictation single key 2.1.4",
  },
];

export function getActiveAdjustmentChips(
  settings: AccessibilitySettings
): ActiveAdjustmentChip[] {
  const chips: ActiveAdjustmentChip[] = [];
  const d = settings.display;
  const t = settings.typography;
  const r = settings.readingAids;

  // Color & Light
  if (d.theme !== "system") {
    const themeName =
      A11Y_THEMES.find((th) => th.id === d.theme)?.name ?? d.theme;
    chips.push({
      id: "theme",
      label: `Theme: ${themeName}`,
      pane: "color-light",
      clear: (s) => ({ ...s, display: { ...s.display, theme: "system" } }),
    });
  }
  const customColorCount = Object.keys(d.customColors).length;
  if (customColorCount > 0) {
    chips.push({
      id: "custom-colors",
      label: `${customColorCount} custom ${customColorCount === 1 ? "color" : "colors"}`,
      pane: "color-light",
      clear: (s) => ({ ...s, display: { ...s.display, customColors: {} } }),
    });
  }
  if (d.brightness !== DEFAULT_COMFORT_SETTINGS.brightness) {
    chips.push({
      id: "brightness",
      label: `Dimmer ${d.brightness}%`,
      pane: "color-light",
      clear: (s) => ({ ...s, display: { ...s.display, brightness: 100 } }),
    });
  }
  if (d.saturation !== DEFAULT_COMFORT_SETTINGS.saturation) {
    chips.push({
      id: "saturation",
      label: d.saturation === 0 ? "Grayscale" : "Muted 50%",
      pane: "color-light",
      clear: (s) => ({ ...s, display: { ...s.display, saturation: 100 } }),
    });
  }
  if (d.tint !== "none") {
    const tintName =
      TINT_PRESETS.find((p) => p.id === d.tint)?.label ?? d.tint;
    chips.push({
      id: "tint",
      label: `Tint: ${tintName}`,
      pane: "color-light",
      clear: (s) => ({
        ...s,
        display: {
          ...s.display,
          tint: "none",
          tintOpacity: DEFAULT_COMFORT_SETTINGS.tintOpacity,
        },
      }),
    });
  }

  // Text & Reading
  if (t.fontFamily !== "default") {
    const fontLabel =
      t.fontFamily === "custom"
        ? t.customFontName
        : (FONT_OPTIONS.find((f) => f.id === t.fontFamily)?.name ??
          t.fontFamily);
    chips.push({
      id: "font",
      label: `Font: ${fontLabel}`,
      pane: "text",
      clear: (s) => ({
        ...s,
        typography: {
          ...s.typography,
          fontFamily: "default",
          customFontName: "",
        },
      }),
    });
  }
  if (t.textScale !== DEFAULT_TYPOGRAPHY_SETTINGS.textScale) {
    chips.push({
      id: "text-scale",
      label: `Text ${t.textScale}%`,
      pane: "text",
      clear: (s) => ({
        ...s,
        typography: { ...s.typography, textScale: 100 },
      }),
    });
  }
  if (t.readingWidth !== DEFAULT_TYPOGRAPHY_SETTINGS.readingWidth) {
    const widthLabel =
      READING_WIDTH_OPTIONS.find((w) => w.id === t.readingWidth)?.label ??
      t.readingWidth;
    chips.push({
      id: "reading-width",
      label: `Width: ${widthLabel}`,
      pane: "text",
      clear: (s) => ({
        ...s,
        typography: { ...s.typography, readingWidth: "full" },
      }),
    });
  }
  if (
    t.lineHeight !== DEFAULT_TYPOGRAPHY_SETTINGS.lineHeight ||
    t.letterSpacing !== DEFAULT_TYPOGRAPHY_SETTINGS.letterSpacing ||
    t.wordSpacing !== DEFAULT_TYPOGRAPHY_SETTINGS.wordSpacing ||
    t.paragraphSpacing !== DEFAULT_TYPOGRAPHY_SETTINGS.paragraphSpacing
  ) {
    chips.push({
      id: "spacing",
      label: "Custom text spacing",
      pane: "text",
      clear: (s) => ({
        ...s,
        typography: {
          ...s.typography,
          lineHeight: DEFAULT_TYPOGRAPHY_SETTINGS.lineHeight,
          letterSpacing: DEFAULT_TYPOGRAPHY_SETTINGS.letterSpacing,
          wordSpacing: DEFAULT_TYPOGRAPHY_SETTINGS.wordSpacing,
          paragraphSpacing: DEFAULT_TYPOGRAPHY_SETTINGS.paragraphSpacing,
        },
      }),
    });
  }
  if (r.bionicReading) {
    chips.push({
      id: "bionic",
      label: "Word anchors",
      pane: "text",
      clear: (s) => ({
        ...s,
        readingAids: { ...s.readingAids, bionicReading: false },
      }),
    });
  }
  if (t.noItalics) {
    chips.push({
      id: "no-italics",
      label: "No italics",
      pane: "text",
      clear: (s) => ({
        ...s,
        typography: { ...s.typography, noItalics: false },
      }),
    });
  }
  if (t.noAllCaps) {
    chips.push({
      id: "no-all-caps",
      label: "No all-caps",
      pane: "text",
      clear: (s) => ({
        ...s,
        typography: { ...s.typography, noAllCaps: false },
      }),
    });
  }
  if (t.leftAlignText) {
    chips.push({
      id: "left-align",
      label: "Left-aligned text",
      pane: "text",
      clear: (s) => ({
        ...s,
        typography: { ...s.typography, leftAlignText: false },
      }),
    });
  }
  if (t.highlightHeadings) {
    chips.push({
      id: "highlight-headings",
      label: "Highlight headings",
      pane: "text",
      clear: (s) => ({
        ...s,
        typography: { ...s.typography, highlightHeadings: false },
      }),
    });
  }

  // Focus & Motion
  if (d.distractionFree) {
    chips.push({
      id: "distraction-free",
      label: "Distraction-free",
      pane: "focus",
      clear: (s) => ({
        ...s,
        display: { ...s.display, distractionFree: false },
      }),
    });
  }
  if (d.reduceMotion) {
    chips.push({
      id: "reduce-motion",
      label: "Reduce motion",
      pane: "focus",
      clear: (s) => ({
        ...s,
        display: { ...s.display, reduceMotion: false },
      }),
    });
  }
  if (d.reduceTransparency) {
    chips.push({
      id: "reduce-transparency",
      label: "Reduce transparency",
      pane: "focus",
      clear: (s) => ({
        ...s,
        display: { ...s.display, reduceTransparency: false },
      }),
    });
  }
  if (d.mediaMode !== "normal") {
    chips.push({
      id: "media-mode",
      label: d.mediaMode === "dim" ? "Dim media" : "Hide media",
      pane: "focus",
      clear: (s) => ({
        ...s,
        display: { ...s.display, mediaMode: "normal" },
      }),
    });
  }
  if (d.pauseMedia) {
    chips.push({
      id: "pause-media",
      label: "Pause autoplay",
      pane: "focus",
      clear: (s) => ({
        ...s,
        display: { ...s.display, pauseMedia: false },
      }),
    });
  }

  // Reading Tools
  if (r.guideStyle !== "off") {
    const label =
      r.guideStyle === "band"
        ? r.focusMask
          ? "Highlight Band + Mask"
          : "Highlight Band"
        : r.focusMask
          ? "Underline + Mask"
          : "Underline Guide";
    chips.push({
      id: "guide",
      label,
      pane: "tools",
      clear: (s) => ({
        ...s,
        readingAids: {
          ...s.readingAids,
          guideStyle: "off",
          focusMask: false,
        },
      }),
    });
  }
  if (r.textMagnifier) {
    chips.push({
      id: "magnifier",
      label: `Magnifier ${r.magnifierScale.toFixed(2)}×`,
      pane: "tools",
      clear: (s) => ({
        ...s,
        readingAids: { ...s.readingAids, textMagnifier: false },
      }),
    });
  }
  if (r.readAloudEnabled) {
    chips.push({
      id: "read-aloud",
      label: "Read Aloud",
      pane: "tools",
      clear: (s) => ({
        ...s,
        readingAids: { ...s.readingAids, readAloudEnabled: false },
      }),
    });
  }

  // Navigation & Input
  if (d.uiScale !== 100) {
    chips.push({
      id: "ui-scale",
      label: `UI Scale ${d.uiScale}%`,
      pane: "navigation",
      clear: (s) => ({ ...s, display: { ...s.display, uiScale: 100 } }),
    });
  }
  if (d.largeTargets) {
    chips.push({
      id: "large-targets",
      label: "44px tap targets",
      pane: "navigation",
      clear: (s) => ({
        ...s,
        display: { ...s.display, largeTargets: false },
      }),
    });
  }
  if (r.cursorMode !== "default") {
    chips.push({
      id: "cursor",
      label: r.cursorMode === "large-dark" ? "Large Dark Cursor" : "Large Light Cursor",
      pane: "navigation",
      clear: (s) => ({
        ...s,
        readingAids: { ...s.readingAids, cursorMode: "default" },
      }),
    });
  }
  if (d.focusHighlight !== "default") {
    chips.push({
      id: "focus-highlight",
      label:
        d.focusHighlight === "high-contrast"
          ? "High-Contrast Focus Ring"
          : "Always Show Focus Ring",
      pane: "navigation",
      clear: (s) => ({
        ...s,
        display: { ...s.display, focusHighlight: "default" },
      }),
    });
  }
  if (d.strongBoundaries) {
    chips.push({
      id: "strong-boundaries",
      label: "Strong borders",
      pane: "navigation",
      clear: (s) => ({
        ...s,
        display: { ...s.display, strongBoundaries: false },
      }),
    });
  }
  if (d.underlineLinks) {
    chips.push({
      id: "underline-links",
      label: "Underline links",
      pane: "navigation",
      clear: (s) => ({
        ...s,
        display: { ...s.display, underlineLinks: false },
      }),
    });
  }
  if (!d.keyboardShortcuts) {
    chips.push({
      id: "shortcuts-off",
      label: "Shortcuts off",
      pane: "navigation",
      clear: (s) => ({
        ...s,
        display: { ...s.display, keyboardShortcuts: true },
      }),
    });
  }
  if (d.disableSingleKeyShortcuts) {
    chips.push({
      id: "no-single-key",
      label: "No single-key hotkeys",
      pane: "navigation",
      clear: (s) => ({
        ...s,
        display: { ...s.display, disableSingleKeyShortcuts: false },
      }),
    });
  }

  return chips;
}

export function getPaneActiveCounts(
  chips: ActiveAdjustmentChip[]
): Record<A11yPaneId, number> {
  const counts: Record<A11yPaneId, number> = {
    overview: 0,
    "color-light": 0,
    text: 0,
    focus: 0,
    tools: 0,
    navigation: 0,
  };
  for (const chip of chips) {
    counts[chip.pane] += 1;
  }
  return counts;
}

export function resetPaneSettings(
  s: AccessibilitySettings,
  pane: A11yPaneId
): AccessibilitySettings {
  switch (pane) {
    case "color-light":
      return {
        ...s,
        display: {
          ...s.display,
          theme: "system",
          customColors: {},
          brightness: DEFAULT_COMFORT_SETTINGS.brightness,
          saturation: DEFAULT_COMFORT_SETTINGS.saturation,
          tint: DEFAULT_COMFORT_SETTINGS.tint,
          tintOpacity: DEFAULT_COMFORT_SETTINGS.tintOpacity,
        },
      };
    case "text":
      return {
        ...s,
        typography: DEFAULT_TYPOGRAPHY_SETTINGS,
        readingAids: {
          ...s.readingAids,
          bionicReading: DEFAULT_READING_AIDS_SETTINGS.bionicReading,
        },
      };
    case "focus":
      return {
        ...s,
        display: {
          ...s.display,
          distractionFree: DEFAULT_COMFORT_SETTINGS.distractionFree,
          reduceMotion: DEFAULT_COMFORT_SETTINGS.reduceMotion,
          reduceTransparency: DEFAULT_COMFORT_SETTINGS.reduceTransparency,
          mediaMode: DEFAULT_COMFORT_SETTINGS.mediaMode,
          pauseMedia: DEFAULT_COMFORT_SETTINGS.pauseMedia,
        },
      };
    case "tools":
      return {
        ...s,
        readingAids: {
          ...DEFAULT_READING_AIDS_SETTINGS,
          cursorMode: s.readingAids.cursorMode,
          bionicReading: s.readingAids.bionicReading,
        },
      };
    case "navigation":
      return {
        ...s,
        display: {
          ...s.display,
          uiScale: DEFAULT_COMFORT_SETTINGS.uiScale,
          largeTargets: DEFAULT_COMFORT_SETTINGS.largeTargets,
          focusHighlight: DEFAULT_COMFORT_SETTINGS.focusHighlight,
          strongBoundaries: DEFAULT_COMFORT_SETTINGS.strongBoundaries,
          underlineLinks: DEFAULT_COMFORT_SETTINGS.underlineLinks,
          keyboardShortcuts: DEFAULT_COMFORT_SETTINGS.keyboardShortcuts,
          disableSingleKeyShortcuts:
            DEFAULT_COMFORT_SETTINGS.disableSingleKeyShortcuts,
        },
        readingAids: {
          ...s.readingAids,
          cursorMode: DEFAULT_READING_AIDS_SETTINGS.cursorMode,
        },
      };
    default:
      return s;
  }
}
