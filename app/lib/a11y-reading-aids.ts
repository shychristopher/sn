export type ReadingGuideStyle = "off" | "underline" | "band";
export type CursorMode = "default" | "large-dark" | "large-light";

export interface ReadingAidsSettings {
  guideStyle: ReadingGuideStyle;
  guideHeight: number; // 32 to 224 (px) for highlight band (also drives focus mask window in band mode)
  focusMask: boolean; // optional dim-outside complement to Reading Guide
  focusMaskHeight: number; // 80 to 240 (px) clear window above underline when guideStyle === "underline"
  focusMaskOpacity: number; // 35 to 80 (%) darkness above & below
  textMagnifier: boolean;
  magnifierScale: number; // 1.5 to 2.25
  cursorMode: CursorMode;
  readAloudEnabled: boolean;
  readAloudRate: number; // 0.75 to 2.0
  readAloudVoiceUri: string; // "" = browser default voice
  readAloudHighlight: boolean; // highlight active block while speaking
  readAloudClickToRead: boolean; // click any paragraph/heading to read from there
  bionicReading: boolean;
}

export const DEFAULT_READING_AIDS_SETTINGS: ReadingAidsSettings = {
  guideStyle: "off",
  guideHeight: 56,
  focusMask: false,
  focusMaskHeight: 140,
  focusMaskOpacity: 55,
  textMagnifier: false,
  magnifierScale: 1.75,
  cursorMode: "default",
  readAloudEnabled: false,
  readAloudRate: 1,
  readAloudVoiceUri: "",
  readAloudHighlight: true,
  readAloudClickToRead: false,
  bionicReading: false,
};

export function sanitizeReadingAids(raw: unknown): ReadingAidsSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_READING_AIDS_SETTINGS;
  const r = raw as Partial<ReadingAidsSettings>;

  const guideStyle: ReadingGuideStyle =
    r.guideStyle === "underline" || r.guideStyle === "band"
      ? r.guideStyle
      : "off";

  const guideHeight =
    typeof r.guideHeight === "number" &&
    r.guideHeight >= 32 &&
    r.guideHeight <= 224
      ? Math.round(r.guideHeight / 8) * 8
      : 56;

  const focusMaskHeight =
    typeof r.focusMaskHeight === "number" &&
    r.focusMaskHeight >= 80 &&
    r.focusMaskHeight <= 240
      ? Math.round(r.focusMaskHeight / 10) * 10
      : 140;

  const focusMaskOpacity =
    typeof r.focusMaskOpacity === "number" &&
    r.focusMaskOpacity >= 35 &&
    r.focusMaskOpacity <= 80
      ? Math.round(r.focusMaskOpacity / 5) * 5
      : 55;

  const magnifierScale =
    typeof r.magnifierScale === "number" &&
    r.magnifierScale >= 1.5 &&
    r.magnifierScale <= 2.25
      ? Math.round(r.magnifierScale * 4) / 4
      : 1.75;

  const cursorMode: CursorMode =
    r.cursorMode === "large-dark" || r.cursorMode === "large-light"
      ? r.cursorMode
      : "default";

  const readAloudRate =
    typeof r.readAloudRate === "number" &&
    r.readAloudRate >= 0.75 &&
    r.readAloudRate <= 2
      ? Math.round(r.readAloudRate * 20) / 20
      : 1;

  const readAloudVoiceUri =
    typeof r.readAloudVoiceUri === "string"
      ? r.readAloudVoiceUri.slice(0, 180)
      : "";

  return {
    guideStyle,
    guideHeight,
    focusMask: Boolean(r.focusMask),
    focusMaskHeight,
    focusMaskOpacity,
    textMagnifier: Boolean(r.textMagnifier),
    magnifierScale,
    cursorMode,
    readAloudEnabled: Boolean(r.readAloudEnabled),
    readAloudRate,
    readAloudVoiceUri,
    readAloudHighlight:
      typeof r.readAloudHighlight === "boolean" ? r.readAloudHighlight : true,
    readAloudClickToRead: Boolean(r.readAloudClickToRead),
    bionicReading: Boolean(r.bionicReading),
  };
}

export function isDefaultReadingAids(r: ReadingAidsSettings): boolean {
  return (
    r.guideStyle === DEFAULT_READING_AIDS_SETTINGS.guideStyle &&
    r.guideHeight === DEFAULT_READING_AIDS_SETTINGS.guideHeight &&
    r.focusMask === DEFAULT_READING_AIDS_SETTINGS.focusMask &&
    r.focusMaskHeight === DEFAULT_READING_AIDS_SETTINGS.focusMaskHeight &&
    r.focusMaskOpacity === DEFAULT_READING_AIDS_SETTINGS.focusMaskOpacity &&
    r.textMagnifier === DEFAULT_READING_AIDS_SETTINGS.textMagnifier &&
    r.magnifierScale === DEFAULT_READING_AIDS_SETTINGS.magnifierScale &&
    r.cursorMode === DEFAULT_READING_AIDS_SETTINGS.cursorMode &&
    r.readAloudEnabled === DEFAULT_READING_AIDS_SETTINGS.readAloudEnabled &&
    r.readAloudRate === DEFAULT_READING_AIDS_SETTINGS.readAloudRate &&
    r.readAloudVoiceUri === DEFAULT_READING_AIDS_SETTINGS.readAloudVoiceUri &&
    r.readAloudHighlight === DEFAULT_READING_AIDS_SETTINGS.readAloudHighlight &&
    r.readAloudClickToRead ===
      DEFAULT_READING_AIDS_SETTINGS.readAloudClickToRead &&
    r.bionicReading === DEFAULT_READING_AIDS_SETTINGS.bionicReading
  );
}

export function applyReadingAidsToDocument(aids: ReadingAidsSettings) {
  const root = document.documentElement;
  if (aids.cursorMode === "default") {
    root.removeAttribute("data-a11y-cursor");
  } else {
    root.setAttribute("data-a11y-cursor", aids.cursorMode);
  }
}
