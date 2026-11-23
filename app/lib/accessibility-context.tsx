"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityModal } from "@/app/components/accessibility-modal";
import { AccessibilityReadingOverlays } from "@/app/components/accessibility-reading-overlays";
import {
  A11Y_THEMES,
  DEFAULT_COMFORT_SETTINGS,
  TINT_PRESETS,
  applyComfortFlagsToDocument,
  applyDisplayToDocument,
  isValidHexColor,
  resolveThemeColors,
  type A11yThemeId,
  type CustomColorKey,
  type DisplayComfortSettings,
  type FocusHighlightMode,
  type MediaMode,
  type SaturationLevel,
  type ThemeColors,
  type TintPresetId,
} from "@/app/lib/a11y-themes";
import {
  A11Y_PROFILES,
  type A11yProfileId,
} from "@/app/lib/a11y-profiles";
import {
  DEFAULT_TYPOGRAPHY_SETTINGS,
  applyTypographyToDocument,
  isDefaultTypography,
  sanitizeTypography,
  type TypographySettings,
} from "@/app/lib/a11y-typography";
import {
  DEFAULT_READING_AIDS_SETTINGS,
  applyReadingAidsToDocument,
  isDefaultReadingAids,
  sanitizeReadingAids,
  type ReadingAidsSettings,
} from "@/app/lib/a11y-reading-aids";

export const A11Y_STORAGE_KEY = "shynotes:a11y-settings:v1";

export interface DisplaySettings extends DisplayComfortSettings {
  theme: A11yThemeId;
  customColors: Partial<Record<CustomColorKey, string>>;
}

export interface AccessibilitySettings {
  version: 1;
  display: DisplaySettings;
  typography: TypographySettings;
  readingAids: ReadingAidsSettings;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  version: 1,
  display: {
    theme: "system",
    customColors: {},
    ...DEFAULT_COMFORT_SETTINGS,
  },
  typography: DEFAULT_TYPOGRAPHY_SETTINGS,
  readingAids: DEFAULT_READING_AIDS_SETTINGS,
};

const VALID_THEME_IDS = new Set<string>(A11Y_THEMES.map((t) => t.id));
const VALID_TINTS = new Set<string>(TINT_PRESETS.map((t) => t.id));
const VALID_COLOR_KEYS: CustomColorKey[] = [
  "background",
  "surface",
  "foreground",
  "mutedForeground",
  "primary",
  "border",
];

function sanitizeSettings(raw: unknown): AccessibilitySettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const obj = raw as Partial<AccessibilitySettings>;
  const d = obj.display;

  const theme: A11yThemeId =
    d && typeof d.theme === "string" && VALID_THEME_IDS.has(d.theme)
      ? (d.theme as A11yThemeId)
      : "system";

  const customColors: Partial<Record<CustomColorKey, string>> = {};
  if (d?.customColors && typeof d.customColors === "object") {
    for (const key of VALID_COLOR_KEYS) {
      const value = d.customColors[key];
      if (typeof value === "string" && isValidHexColor(value)) {
        customColors[key] = value.toLowerCase();
      }
    }
  }

  const legacyTypoScale = (
    obj.typography as unknown as { uiScale?: unknown } | undefined
  )?.uiScale;
  const rawUiScale =
    typeof d?.uiScale === "number"
      ? d.uiScale
      : typeof legacyTypoScale === "number"
        ? legacyTypoScale
        : 100;

  const uiScale =
    rawUiScale >= 85 && rawUiScale <= 140
      ? Math.round(rawUiScale / 5) * 5
      : 100;

  const brightness =
    typeof d?.brightness === "number" &&
    d.brightness >= 60 &&
    d.brightness <= 100
      ? Math.round(d.brightness)
      : 100;

  const saturation: SaturationLevel =
    d?.saturation === 0 || d?.saturation === 50 || d?.saturation === 100
      ? d.saturation
      : 100;

  const tint: TintPresetId =
    typeof d?.tint === "string" && VALID_TINTS.has(d.tint)
      ? (d.tint as TintPresetId)
      : "none";

  const tintOpacity =
    typeof d?.tintOpacity === "number" &&
    d.tintOpacity >= 8 &&
    d.tintOpacity <= 30
      ? Math.round(d.tintOpacity)
      : 16;

  const focusHighlight: FocusHighlightMode =
    d?.focusHighlight === "always" || d?.focusHighlight === "high-contrast"
      ? d.focusHighlight
      : "default";

  const mediaMode: MediaMode =
    d?.mediaMode === "dim" || d?.mediaMode === "hide" ? d.mediaMode : "normal";

  return {
    version: 1,
    display: {
      theme,
      customColors,
      uiScale,
      brightness,
      saturation,
      tint,
      tintOpacity,
      reduceTransparency: Boolean(d?.reduceTransparency),
      strongBoundaries: Boolean(d?.strongBoundaries),
      underlineLinks: Boolean(d?.underlineLinks),
      reduceMotion: Boolean(d?.reduceMotion),
      largeTargets: Boolean(d?.largeTargets),
      focusHighlight,
      distractionFree: Boolean(d?.distractionFree),
      keyboardShortcuts:
        typeof d?.keyboardShortcuts === "boolean" ? d.keyboardShortcuts : true,
      disableSingleKeyShortcuts: Boolean(d?.disableSingleKeyShortcuts),
      mediaMode,
      pauseMedia: Boolean(d?.pauseMedia),
    },
    typography: sanitizeTypography(obj.typography),
    readingAids: sanitizeReadingAids(obj.readingAids),
  };
}

function isDefaultDisplay(d: DisplaySettings): boolean {
  return (
    d.theme === "system" &&
    Object.keys(d.customColors).length === 0 &&
    d.uiScale === 100 &&
    d.brightness === 100 &&
    d.saturation === 100 &&
    d.tint === "none" &&
    d.tintOpacity === 16 &&
    !d.reduceTransparency &&
    !d.strongBoundaries &&
    !d.underlineLinks &&
    !d.reduceMotion &&
    !d.largeTargets &&
    d.focusHighlight === "default" &&
    !d.distractionFree &&
    d.keyboardShortcuts &&
    !d.disableSingleKeyShortcuts &&
    d.mediaMode === "normal" &&
    !d.pauseMedia
  );
}

function readStoredSettings(): AccessibilitySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getSystemScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  systemScheme: "light" | "dark";
  resolvedColors: ThemeColors;
  resolvedScheme: "light" | "dark";
  hasCustomizations: boolean;
  hasCustomColors: boolean;
  hasCustomTypography: boolean;
  hasCustomReadingAids: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  setTheme: (theme: A11yThemeId) => void;
  setCustomColor: (key: CustomColorKey, hex: string) => void;
  clearCustomColor: (key: CustomColorKey) => void;
  clearAllCustomColors: () => void;
  updateDisplayComfort: (patch: Partial<DisplayComfortSettings>) => void;
  updateTypography: (patch: Partial<TypographySettings>) => void;
  resetTypography: () => void;
  updateReadingAids: (patch: Partial<ReadingAidsSettings>) => void;
  resetReadingAids: () => void;
  applyProfile: (profileId: A11yProfileId) => void;
  replaceSettings: (
    updater: (prev: AccessibilitySettings) => AccessibilitySettings
  ) => void;
  exportSettingsJson: () => string;
  importSettingsJson: (
    rawJson: string
  ) => { ok: true } | { ok: false; error: string };
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(
  null
);

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider"
    );
  }
  return ctx;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] =
    useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">("light");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Re-apply stored settings synchronously before paint (handles Strict Mode dev remounts)
  useLayoutEffect(() => {
    const stored = readStoredSettings();
    const sys = getSystemScheme();
    applyDisplayToDocument(
      stored.display.theme,
      stored.display.customColors,
      sys
    );
    applyComfortFlagsToDocument(stored.display);
    applyTypographyToDocument(stored.typography);
    applyReadingAidsToDocument(stored.readingAids);
    queueMicrotask(() => {
      setSystemScheme(sys);
      setSettings(stored);
    });
  }, []);

  // Track live OS color scheme changes & cross-tab localStorage updates
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSchemeChange = () => {
      const nextSys: "light" | "dark" = mq.matches ? "dark" : "light";
      setSystemScheme(nextSys);
      setSettings((current) => {
        applyDisplayToDocument(
          current.display.theme,
          current.display.customColors,
          nextSys
        );
        return current;
      });
    };
    mq.addEventListener("change", handleSchemeChange);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === A11Y_STORAGE_KEY || event.key === null) {
        const next = readStoredSettings();
        const sys = getSystemScheme();
        setSettings(next);
        applyDisplayToDocument(
          next.display.theme,
          next.display.customColors,
          sys
        );
        applyComfortFlagsToDocument(next.display);
        applyTypographyToDocument(next.typography);
        applyReadingAidsToDocument(next.readingAids);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      mq.removeEventListener("change", handleSchemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const commitSettings = useCallback(
    (updater: (prev: AccessibilitySettings) => AccessibilitySettings) => {
      setSettings((prev) => {
        const next = updater(prev);
        const sys = getSystemScheme();
        applyDisplayToDocument(
          next.display.theme,
          next.display.customColors,
          sys
        );
        applyComfortFlagsToDocument(next.display);
        applyTypographyToDocument(next.typography);
        applyReadingAidsToDocument(next.readingAids);
        try {
          if (
            isDefaultDisplay(next.display) &&
            isDefaultTypography(next.typography) &&
            isDefaultReadingAids(next.readingAids)
          ) {
            localStorage.removeItem(A11Y_STORAGE_KEY);
          } else {
            localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
          }
        } catch {
          // Ignore storage errors; settings still apply in-memory
        }
        return next;
      });
    },
    []
  );

  const setTheme = useCallback(
    (theme: A11yThemeId) => {
      commitSettings((prev) => ({
        ...prev,
        display: {
          ...prev.display,
          theme,
        },
      }));
    },
    [commitSettings]
  );

  const setCustomColor = useCallback(
    (key: CustomColorKey, hex: string) => {
      if (!isValidHexColor(hex)) return;
      commitSettings((prev) => ({
        ...prev,
        display: {
          ...prev.display,
          customColors: {
            ...prev.display.customColors,
            [key]: hex.toLowerCase(),
          },
        },
      }));
    },
    [commitSettings]
  );

  const clearCustomColor = useCallback(
    (key: CustomColorKey) => {
      commitSettings((prev) => {
        const nextColors = { ...prev.display.customColors };
        delete nextColors[key];
        return {
          ...prev,
          display: {
            ...prev.display,
            customColors: nextColors,
          },
        };
      });
    },
    [commitSettings]
  );

  const clearAllCustomColors = useCallback(() => {
    commitSettings((prev) => ({
      ...prev,
      display: {
        ...prev.display,
        customColors: {},
      },
    }));
  }, [commitSettings]);

  const updateDisplayComfort = useCallback(
    (patch: Partial<DisplayComfortSettings>) => {
      commitSettings((prev) => ({
        ...prev,
        display: {
          ...prev.display,
          ...patch,
        },
      }));
    },
    [commitSettings]
  );

  const updateTypography = useCallback(
    (patch: Partial<TypographySettings>) => {
      commitSettings((prev) => ({
        ...prev,
        typography: {
          ...prev.typography,
          ...patch,
        },
      }));
    },
    [commitSettings]
  );

  const resetTypography = useCallback(() => {
    commitSettings((prev) => ({
      ...prev,
      typography: DEFAULT_TYPOGRAPHY_SETTINGS,
    }));
  }, [commitSettings]);

  const updateReadingAids = useCallback(
    (patch: Partial<ReadingAidsSettings>) => {
      commitSettings((prev) => ({
        ...prev,
        readingAids: {
          ...prev.readingAids,
          ...patch,
        },
      }));
    },
    [commitSettings]
  );

  const resetReadingAids = useCallback(() => {
    commitSettings((prev) => ({
      ...prev,
      readingAids: DEFAULT_READING_AIDS_SETTINGS,
    }));
  }, [commitSettings]);

  const applyProfile = useCallback(
    (profileId: A11yProfileId) => {
      const profile = A11Y_PROFILES.find((p) => p.id === profileId);
      if (!profile) return;
      const sys = getSystemScheme();
      const overrides = profile.getOverrides(sys);
      commitSettings(() =>
        sanitizeSettings({
          version: 1,
          display: {
            ...DEFAULT_SETTINGS.display,
            theme: overrides.theme ?? "system",
            ...overrides.comfort,
          },
          typography: {
            ...DEFAULT_TYPOGRAPHY_SETTINGS,
            ...overrides.typography,
          },
          readingAids: {
            ...DEFAULT_READING_AIDS_SETTINGS,
            ...overrides.readingAids,
          },
        })
      );
    },
    [commitSettings]
  );

  const exportSettingsJson = useCallback(() => {
    return JSON.stringify(
      {
        app: "Shy Notes",
        exportedAt: new Date().toISOString(),
        settings,
      },
      null,
      2
    );
  }, [settings]);

  const importSettingsJson = useCallback(
    (rawJson: string): { ok: true } | { ok: false; error: string } => {
      try {
        const parsed: unknown = JSON.parse(rawJson);
        if (!parsed || typeof parsed !== "object") {
          return { ok: false, error: "File does not contain a JSON object." };
        }
        const wrapper = parsed as {
          settings?: unknown;
          display?: unknown;
          typography?: unknown;
          readingAids?: unknown;
        };
        const candidate =
          wrapper.settings && typeof wrapper.settings === "object"
            ? wrapper.settings
            : parsed;
        if (
          !("display" in (candidate as Record<string, unknown>)) &&
          !("typography" in (candidate as Record<string, unknown>)) &&
          !("readingAids" in (candidate as Record<string, unknown>))
        ) {
          return {
            ok: false,
            error:
              "JSON does not look like a Shy Notes accessibility export.",
          };
        }
        const sanitized = sanitizeSettings(candidate);
        commitSettings(() => sanitized);
        return { ok: true };
      } catch {
        return { ok: false, error: "Invalid JSON syntax. Please check the file." };
      }
    },
    [commitSettings]
  );

  const resetSettings = useCallback(() => {
    commitSettings(() => DEFAULT_SETTINGS);
  }, [commitSettings]);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  // Global keyboard shortcuts (Alt+Shift+A / G / R) when enabled
  useEffect(() => {
    if (!settings.display.keyboardShortcuts) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
      const key = e.key.toLowerCase();

      if (key === "a") {
        e.preventDefault();
        setIsModalOpen((prev) => !prev);
      } else if (key === "g") {
        e.preventDefault();
        commitSettings((prev) => ({
          ...prev,
          readingAids: {
            ...prev.readingAids,
            guideStyle:
              prev.readingAids.guideStyle === "off" ? "band" : "off",
          },
        }));
      } else if (key === "r") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("shynotes:read-aloud-toggle"));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settings.display.keyboardShortcuts, commitSettings]);

  // Pause & prevent autoplay on <video>/<audio> elements when pauseMedia is enabled
  useEffect(() => {
    if (!settings.display.pauseMedia) return;

    const pauseAll = () => {
      document
        .querySelectorAll<HTMLMediaElement>("video, audio")
        .forEach((el) => {
          el.autoplay = false;
          if (!el.paused) el.pause();
        });
    };

    pauseAll();
    const observer = new MutationObserver(pauseAll);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [settings.display.pauseMedia]);

  const { scheme: resolvedScheme, colors: resolvedColors } = useMemo(
    () =>
      resolveThemeColors(
        settings.display.theme,
        systemScheme,
        settings.display.customColors
      ),
    [settings.display.theme, settings.display.customColors, systemScheme]
  );

  const hasCustomColors =
    Object.keys(settings.display.customColors).length > 0;
  const hasCustomTypography = !isDefaultTypography(settings.typography);
  const hasCustomReadingAids = !isDefaultReadingAids(settings.readingAids);
  const hasCustomizations =
    !isDefaultDisplay(settings.display) ||
    hasCustomTypography ||
    hasCustomReadingAids;

  const activeTintHex =
    TINT_PRESETS.find((t) => t.id === settings.display.tint)?.hex ?? null;
  const dimAlpha = Math.max(
    0,
    Math.min(0.45, (100 - settings.display.brightness) / 100)
  );

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        systemScheme,
        resolvedColors,
        resolvedScheme,
        hasCustomizations,
        hasCustomColors,
        hasCustomTypography,
        hasCustomReadingAids,
        isModalOpen,
        openModal,
        closeModal,
        setTheme,
        setCustomColor,
        clearCustomColor,
        clearAllCustomColors,
        updateDisplayComfort,
        updateTypography,
        resetTypography,
        updateReadingAids,
        resetReadingAids,
        applyProfile,
        replaceSettings: commitSettings,
        exportSettingsJson,
        importSettingsJson,
        resetSettings,
      }}
    >
      {children}

      {/* Display overlays (pointer-events-none, stripped in print & Print Preview) */}
      {settings.display.saturation < 100 && (
        <div
          aria-hidden="true"
          className="no-print pointer-events-none fixed inset-0 z-9997"
          style={{
            backdropFilter: `saturate(${settings.display.saturation}%)`,
            WebkitBackdropFilter: `saturate(${settings.display.saturation}%)`,
          }}
        />
      )}

      {activeTintHex && (
        <div
          aria-hidden="true"
          className="no-print a11y-swatch pointer-events-none fixed inset-0 z-9998"
          style={{
            backgroundColor: activeTintHex,
            opacity: settings.display.tintOpacity / 100,
            mixBlendMode: resolvedScheme === "dark" ? "screen" : "multiply",
          }}
        />
      )}

      {dimAlpha > 0 && (
        <div
          aria-hidden="true"
          className="no-print pointer-events-none fixed inset-0 z-9999"
          style={{
            backgroundColor: `rgb(0 0 0 / ${dimAlpha.toFixed(2)})`,
          }}
        />
      )}

      {/* Reading Aid overlays & Read Aloud player */}
      <AccessibilityReadingOverlays />

      <AccessibilityModal open={isModalOpen} onClose={closeModal} />
    </AccessibilityContext.Provider>
  );
}
