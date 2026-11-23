import type {
  A11yThemeId,
  DisplayComfortSettings,
} from "@/app/lib/a11y-themes";
import {
  WCAG_COMFORT_SPACING,
  type TypographySettings,
} from "@/app/lib/a11y-typography";
import type { ReadingAidsSettings } from "@/app/lib/a11y-reading-aids";

export type A11yProfileId =
  | "dyslexia"
  | "low-vision"
  | "adhd-focus"
  | "migraine"
  | "motor-keyboard"
  | "screen-reader";

export interface A11yProfileDefinition {
  id: A11yProfileId;
  name: string;
  description: string;
  highlights: string[];
  /**
   * Produces overrides applied cleanly on top of DEFAULT_SETTINGS.
   */
  getOverrides: (systemScheme: "light" | "dark") => {
    theme?: A11yThemeId;
    comfort?: Partial<DisplayComfortSettings>;
    typography?: Partial<TypographySettings>;
    readingAids?: Partial<ReadingAidsSettings>;
  };
}

export const A11Y_PROFILES: A11yProfileDefinition[] = [
  {
    id: "dyslexia",
    name: "Dyslexia-Friendly",
    description:
      "Weighted letterforms, calm warm paper, generous spacing, and upright left-aligned prose.",
    highlights: [
      "OpenDyslexic font",
      "Warm Paper",
      "WCAG spacing",
      "No italics / all-caps",
      "Highlight Band",
    ],
    getOverrides: () => ({
      theme: "paper",
      comfort: {
        underlineLinks: true,
      },
      typography: {
        fontFamily: "opendyslexic",
        ...WCAG_COMFORT_SPACING,
        noItalics: true,
        noAllCaps: true,
        leftAlignText: true,
        highlightHeadings: true,
      },
      readingAids: {
        guideStyle: "band",
        guideHeight: 56,
      },
    }),
  },
  {
    id: "low-vision",
    name: "Low Vision",
    description:
      "Maximum contrast, hyperlegible glyphs, larger interface & text scale, and a high-visibility pointer.",
    highlights: [
      "High Contrast AAA",
      "Atkinson Hyperlegible",
      "120% UI & 125% text",
      "44px targets",
      "Large cursor",
    ],
    getOverrides: (systemScheme) => ({
      theme:
        systemScheme === "dark" ? "high-contrast-dark" : "high-contrast-light",
      comfort: {
        uiScale: 120,
        strongBoundaries: true,
        underlineLinks: true,
        largeTargets: true,
        focusHighlight: "high-contrast",
      },
      typography: {
        fontFamily: "atkinson",
        textScale: 125,
        lineHeight: 1.75,
        highlightHeadings: true,
      },
      readingAids: {
        cursorMode: systemScheme === "dark" ? "large-light" : "large-dark",
      },
    }),
  },
  {
    id: "adhd-focus",
    name: "ADHD & Deep Focus",
    description:
      "Strips visual noise, narrows reading width, dims media, and spotlights your active reading line.",
    highlights: [
      "Distraction-Free Mode",
      "Reading Guide + Mask",
      "68ch column",
      "Dim media",
      "Reduced motion",
    ],
    getOverrides: () => ({
      theme: "soft-gray",
      comfort: {
        distractionFree: true,
        reduceMotion: true,
        mediaMode: "dim",
        pauseMedia: true,
      },
      typography: {
        fontFamily: "lexend",
        readingWidth: "standard",
        highlightHeadings: true,
      },
      readingAids: {
        guideStyle: "band",
        guideHeight: 72,
        focusMask: true,
        focusMaskOpacity: 55,
      },
    }),
  },
  {
    id: "migraine",
    name: "Migraine & Light Sensitive",
    description:
      "Lowers screen glare with dark surfaces, soft dimming, warm amber veil, muted chroma, and zero motion.",
    highlights: [
      "Dark theme",
      "75% dimmer",
      "Warm Amber tint",
      "50% saturation",
      "Zero motion & glare",
    ],
    getOverrides: () => ({
      theme: "dark",
      comfort: {
        brightness: 75,
        saturation: 50,
        tint: "amber",
        tintOpacity: 16,
        reduceTransparency: true,
        reduceMotion: true,
        mediaMode: "dim",
        pauseMedia: true,
      },
    }),
  },
  {
    id: "motor-keyboard",
    name: "Motor & Keyboard",
    description:
      "Generous 44×44px click/tap targets, unmistakable double-ring focus outlines, and keyboard shortcuts.",
    highlights: [
      "44px tap targets",
      "Double-ring focus",
      "Strong borders",
      "Underlined links",
      "Keyboard shortcuts",
    ],
    getOverrides: () => ({
      comfort: {
        largeTargets: true,
        focusHighlight: "high-contrast",
        strongBoundaries: true,
        underlineLinks: true,
        keyboardShortcuts: true,
      },
    }),
  },
  {
    id: "screen-reader",
    name: "Voice Control & Assistive",
    description:
      "Disables single-key shortcuts for speech dictation, pauses autoplay media, and enables Read Aloud.",
    highlights: [
      "No single-key shortcuts",
      "Pause autoplay",
      "Hide media",
      "Read Aloud ready",
      "Reduced motion",
    ],
    getOverrides: () => ({
      comfort: {
        disableSingleKeyShortcuts: true,
        reduceMotion: true,
        strongBoundaries: true,
        underlineLinks: true,
        mediaMode: "hide",
        pauseMedia: true,
      },
      readingAids: {
        readAloudEnabled: true,
        readAloudHighlight: true,
        readAloudClickToRead: true,
      },
    }),
  },
];
