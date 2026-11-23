"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { useAccessibility } from "@/app/lib/accessibility-context";
import { Button } from "@/components/ui/button";

const MAGNIFIER_SELECTOR =
  "p, h1, h2, h3, h4, h5, h6, li, a, button, label, dt, dd, blockquote, td, th";

const READABLE_BLOCK_SELECTOR = "h1, h2, h3, h4, h5, h6, p, li, blockquote";

function extractReadableSnippet(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) return null;
  if (
    target.closest("[data-a11y-magnifier]") ||
    target.closest("[data-a11y-read-aloud]")
  ) {
    return null;
  }

  const el = target.closest<HTMLElement>(MAGNIFIER_SELECTOR);
  if (!el) return null;

  const text = (el.innerText || el.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > 260 ? `${text.slice(0, 257)}…` : text;
}

function extractSpokenText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('[aria-hidden="true"], .no-print')
    .forEach((node) => node.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

function getReadableBlocks(): HTMLElement[] {
  const root =
    document.querySelector<HTMLElement>(".printable-course") ??
    document.querySelector<HTMLElement>("main") ??
    document.body;

  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(READABLE_BLOCK_SELECTOR)
  );

  return candidates.filter((el) => {
    if (
      el.closest(".no-print") ||
      el.closest("dialog") ||
      el.closest("[data-a11y-read-aloud]") ||
      el.closest("[aria-hidden='true']")
    ) {
      return false;
    }
    // Skip container blocks that contain nested readable children (e.g. <li><p>...</p></li>)
    if (el.querySelector(READABLE_BLOCK_SELECTOR)) {
      return false;
    }
    return extractSpokenText(el).length > 0;
  });
}

function clearSpeakingHighlight() {
  document
    .querySelectorAll<HTMLElement>("[data-a11y-speaking='true']")
    .forEach((el) => el.removeAttribute("data-a11y-speaking"));
}

export function AccessibilityReadingOverlays() {
  const { settings, updateReadingAids } = useAccessibility();
  const ra = settings.readingAids;
  const reduceMotion = settings.display.reduceMotion;
  const pathname = usePathname();

  const [pointerY, setPointerY] = useState<number>(300);
  const [magnifiedText, setMagnifiedText] = useState<string | null>(null);
  const [speechState, setSpeechState] = useState<"idle" | "playing" | "paused">(
    "idle"
  );
  const [activeBlockInfo, setActiveBlockInfo] = useState<{
    index: number;
    total: number;
    mode: "blocks" | "selection";
  } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const sessionRef = useRef<number>(0);
  const blocksRef = useRef<HTMLElement[]>([]);
  const currentIndexRef = useRef<number>(0);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const cancelTimerRef = useRef<number | null>(null);
  const highlightRef = useRef<boolean>(ra.readAloudHighlight);
  const reduceMotionRef = useRef<boolean>(reduceMotion);

  useEffect(() => {
    highlightRef.current = ra.readAloudHighlight;
    reduceMotionRef.current = reduceMotion;
    // Live-sync highlight if toggled mid-playback or while paused
    const activeEl = activeElementRef.current;
    if (activeEl && speechState !== "idle") {
      if (ra.readAloudHighlight) {
        activeEl.setAttribute("data-a11y-speaking", "true");
      } else {
        activeEl.removeAttribute("data-a11y-speaking");
      }
    }
  }, [ra.readAloudHighlight, reduceMotion, speechState]);

  const supportsSpeech = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false
  );

  const needsYTracking = ra.guideStyle !== "off";

  // Track vertical pointer & keyboard focus coordinates for Reading Guide / Focus Mask
  useEffect(() => {
    if (!needsYTracking) return;

    const onPointerMove = (e: PointerEvent) => {
      setPointerY(e.clientY);
    };
    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement) {
        const rect = e.target.getBoundingClientRect();
        if (rect.height > 0) {
          setPointerY(rect.top + rect.height / 2);
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("focusin", onFocusIn, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("focusin", onFocusIn);
    };
  }, [needsYTracking]);

  // Live Text Magnifier hover & keyboard-focus listener
  useEffect(() => {
    if (!ra.textMagnifier) {
      queueMicrotask(() => setMagnifiedText(null));
      return;
    }

    const onPointerOver = (e: PointerEvent) => {
      const snippet = extractReadableSnippet(e.target);
      if (snippet) setMagnifiedText(snippet);
    };
    const onFocusIn = (e: FocusEvent) => {
      const snippet = extractReadableSnippet(e.target);
      if (snippet) setMagnifiedText(snippet);
    };
    const onPointerLeaveDoc = () => {
      setMagnifiedText(null);
    };

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("focusin", onFocusIn, { passive: true });
    document.addEventListener("mouseleave", onPointerLeaveDoc);
    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("mouseleave", onPointerLeaveDoc);
    };
  }, [ra.textMagnifier]);

  const stopSpeech = useCallback(() => {
    sessionRef.current += 1;
    if (cancelTimerRef.current !== null) {
      window.clearTimeout(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }
    utteranceRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    clearSpeakingHighlight();
    activeElementRef.current = null;
    blocksRef.current = [];
    currentIndexRef.current = 0;
    setActiveBlockInfo(null);
    setSpeechState("idle");
  }, []);

  const speakBlockAt = useCallback(
    (
      blocks: HTMLElement[],
      startIndex: number,
      sessionId: number,
      needsCancel: boolean
    ) => {
      const speakNext = (index: number) => {
        if (!supportsSpeech || sessionId !== sessionRef.current) return;
        if (index < 0 || index >= blocks.length) {
          utteranceRef.current = null;
          activeElementRef.current = null;
          clearSpeakingHighlight();
          setActiveBlockInfo(null);
          setSpeechState("idle");
          return;
        }

        const synth = window.speechSynthesis;
        const el = blocks[index];
        const text = extractSpokenText(el);

        if (!text) {
          speakNext(index + 1);
          return;
        }

        currentIndexRef.current = index;
        activeElementRef.current = el;
        clearSpeakingHighlight();
        if (highlightRef.current) {
          el.setAttribute("data-a11y-speaking", "true");
          el.scrollIntoView({
            behavior: reduceMotionRef.current ? "auto" : "smooth",
            block: "nearest",
          });
        }

        setActiveBlockInfo({
          index,
          total: blocks.length,
          mode: "blocks",
        });
        setSpeechState("playing");

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = ra.readAloudRate;

        if (ra.readAloudVoiceUri) {
          const chosen = synth
            .getVoices()
            .find((v) => v.voiceURI === ra.readAloudVoiceUri);
          if (chosen) utterance.voice = chosen;
        }

        utterance.onend = () => {
          if (sessionId !== sessionRef.current) return;
          speakNext(index + 1);
        };
        utterance.onerror = (event) => {
          if (sessionId !== sessionRef.current) return;
          // Ignore spurious interrupted/canceled events emitted during queue transitions
          if (
            event.error === "canceled" ||
            event.error === "interrupted"
          ) {
            return;
          }
          utteranceRef.current = null;
          activeElementRef.current = null;
          clearSpeakingHighlight();
          setActiveBlockInfo(null);
          setSpeechState("idle");
        };

        // Hold a strong ref so Chromium/WebKit doesn't GC the utterance before onend
        utteranceRef.current = utterance;
        synth.speak(utterance);
      };

      if (cancelTimerRef.current !== null) {
        window.clearTimeout(cancelTimerRef.current);
        cancelTimerRef.current = null;
      }

      const synth = window.speechSynthesis;
      if (needsCancel && (synth.speaking || synth.pending)) {
        synth.cancel();
        // Give macOS Safari/Chrome a brief tick to finish tearing down the canceled queue
        cancelTimerRef.current = window.setTimeout(() => {
          cancelTimerRef.current = null;
          speakNext(startIndex);
        }, 50);
      } else {
        speakNext(startIndex);
      }
    },
    [supportsSpeech, ra.readAloudRate, ra.readAloudVoiceUri]
  );

  const startFromBlock = useCallback(
    (startElement?: HTMLElement) => {
      if (!supportsSpeech) return;
      const blocks = getReadableBlocks();
      if (blocks.length === 0) return;

      const startIndex = startElement
        ? Math.max(0, blocks.indexOf(startElement))
        : 0;

      sessionRef.current += 1;
      blocksRef.current = blocks;
      speakBlockAt(blocks, startIndex, sessionRef.current, true);
    },
    [supportsSpeech, speakBlockAt]
  );

  const speakSelection = useCallback(
    (selectedText: string, anchorBlock: HTMLElement | null) => {
      if (!supportsSpeech) return;
      const synth = window.speechSynthesis;
      sessionRef.current += 1;
      const sessionId = sessionRef.current;

      if (cancelTimerRef.current !== null) {
        window.clearTimeout(cancelTimerRef.current);
        cancelTimerRef.current = null;
      }

      clearSpeakingHighlight();
      blocksRef.current = [];
      activeElementRef.current = anchorBlock;
      if (anchorBlock && highlightRef.current) {
        anchorBlock.setAttribute("data-a11y-speaking", "true");
      }

      setActiveBlockInfo({ index: 0, total: 1, mode: "selection" });
      setSpeechState("playing");

      const run = () => {
        if (sessionId !== sessionRef.current) return;
        const utterance = new SpeechSynthesisUtterance(selectedText);
        utterance.rate = ra.readAloudRate;

        if (ra.readAloudVoiceUri) {
          const chosen = synth
            .getVoices()
            .find((v) => v.voiceURI === ra.readAloudVoiceUri);
          if (chosen) utterance.voice = chosen;
        }

        utterance.onend = () => {
          if (sessionId !== sessionRef.current) return;
          utteranceRef.current = null;
          activeElementRef.current = null;
          clearSpeakingHighlight();
          setActiveBlockInfo(null);
          setSpeechState("idle");
        };
        utterance.onerror = (event) => {
          if (sessionId !== sessionRef.current) return;
          if (
            event.error === "canceled" ||
            event.error === "interrupted"
          ) {
            return;
          }
          utteranceRef.current = null;
          activeElementRef.current = null;
          clearSpeakingHighlight();
          setActiveBlockInfo(null);
          setSpeechState("idle");
        };

        utteranceRef.current = utterance;
        synth.speak(utterance);
      };

      if (synth.speaking || synth.pending) {
        synth.cancel();
        cancelTimerRef.current = window.setTimeout(() => {
          cancelTimerRef.current = null;
          run();
        }, 50);
      } else {
        run();
      }
    },
    [supportsSpeech, ra.readAloudRate, ra.readAloudVoiceUri]
  );

  const handlePlayPause = useCallback(() => {
    if (!supportsSpeech) return;
    const synth = window.speechSynthesis;

    if (speechState === "playing") {
      synth.pause();
      setSpeechState("paused");
      return;
    }

    if (speechState === "paused") {
      synth.resume();
      setSpeechState("playing");
      return;
    }

    const selection = window.getSelection();
    const selected = selection?.toString().trim() ?? "";
    if (selected.length > 0) {
      const anchorNode = selection?.anchorNode ?? null;
      const anchorEl =
        anchorNode instanceof HTMLElement
          ? anchorNode
          : anchorNode?.parentElement ?? null;
      const anchorBlock =
        anchorEl?.closest<HTMLElement>(READABLE_BLOCK_SELECTOR) ?? null;
      speakSelection(selected, anchorBlock);
      return;
    }

    startFromBlock();
  }, [supportsSpeech, speechState, speakSelection, startFromBlock]);

  const handleSkip = useCallback(
    (delta: -1 | 1) => {
      if (!supportsSpeech || blocksRef.current.length === 0) return;
      const nextIndex = Math.max(
        0,
        Math.min(blocksRef.current.length - 1, currentIndexRef.current + delta)
      );
      sessionRef.current += 1;
      speakBlockAt(blocksRef.current, nextIndex, sessionRef.current, true);
    },
    [supportsSpeech, speakBlockAt]
  );

  // Cancel Read Aloud cleanly on route navigation or toggle off
  useEffect(() => {
    queueMicrotask(() => stopSpeech());
  }, [pathname, ra.readAloudEnabled, stopSpeech]);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      if (cancelTimerRef.current !== null) {
        window.clearTimeout(cancelTimerRef.current);
        cancelTimerRef.current = null;
      }
      utteranceRef.current = null;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      clearSpeakingHighlight();
    };
  }, []);

  // Track text selection when Read Aloud player is visible
  useEffect(() => {
    if (!ra.readAloudEnabled) {
      queueMicrotask(() => setHasSelection(false));
      return;
    }
    const onSelectionChange = () => {
      const text = window.getSelection()?.toString().trim() ?? "";
      setHasSelection(text.length > 0);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, [ra.readAloudEnabled]);

  // Click-to-Read paragraph mode
  useEffect(() => {
    const active = ra.readAloudEnabled && ra.readAloudClickToRead;
    const root = document.documentElement;
    if (active) {
      root.setAttribute("data-a11y-click-to-read", "true");
    } else {
      root.removeAttribute("data-a11y-click-to-read");
    }

    if (!active) return;

    const onClick = (e: MouseEvent) => {
      const targetEl =
        e.target instanceof Element
          ? e.target
          : (e.target as Node | null)?.parentElement ?? null;
      if (!targetEl) return;
      // Don't hijack links, buttons, inputs, dialogs, or text drag selections
      if (
        targetEl.closest(
          "a, button, input, select, textarea, summary, dialog, [data-a11y-read-aloud], .no-print"
        )
      ) {
        return;
      }
      if ((window.getSelection()?.toString().trim().length ?? 0) > 0) {
        return;
      }
      const container = targetEl.closest(".printable-course, main");
      if (!container) return;

      const block = targetEl.closest<HTMLElement>(READABLE_BLOCK_SELECTOR);
      if (!block) return;
      startFromBlock(block);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      root.removeAttribute("data-a11y-click-to-read");
    };
  }, [ra.readAloudEnabled, ra.readAloudClickToRead, startFromBlock]);

  // Global Alt+Shift+R keyboard shortcut bridge
  useEffect(() => {
    const onShortcutToggle = () => {
      if (!ra.readAloudEnabled) {
        updateReadingAids({ readAloudEnabled: true });
        setTimeout(() => startFromBlock(), 50);
      } else {
        handlePlayPause();
      }
    };
    window.addEventListener("shynotes:read-aloud-toggle", onShortcutToggle);
    return () =>
      window.removeEventListener(
        "shynotes:read-aloud-toggle",
        onShortcutToggle
      );
  }, [ra.readAloudEnabled, updateReadingAids, startFromBlock, handlePlayPause]);

  const showFocusMask = ra.guideStyle !== "off" && ra.focusMask;
  const maskAlpha = (ra.focusMaskOpacity / 100).toFixed(2);

  const bandTop = Math.max(0, pointerY - ra.guideHeight / 2);
  const underlineY = Math.max(0, pointerY + 12);

  const topMaskHeight =
    ra.guideStyle === "band"
      ? bandTop
      : Math.max(0, underlineY - ra.focusMaskHeight);
  const bottomMaskTop =
    ra.guideStyle === "band" ? bandTop + ra.guideHeight : underlineY + 3;

  return (
    <>
      {/* 1. Optional Focus Mask Complementing the Active Reading Guide */}
      {showFocusMask && (
        <>
          <div
            aria-hidden="true"
            className="no-print pointer-events-none fixed inset-x-0 top-0 z-9989"
            style={{
              height: `${topMaskHeight}px`,
              backgroundColor: `rgb(0 0 0 / ${maskAlpha})`,
            }}
          />
          <div
            aria-hidden="true"
            className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-9989"
            style={{
              top: `${bottomMaskTop}px`,
              backgroundColor: `rgb(0 0 0 / ${maskAlpha})`,
            }}
          />
        </>
      )}

      {/* 2. Reading Guide (Underline or Highlight Band) */}
      {ra.guideStyle === "underline" && (
        <div
          aria-hidden="true"
          className="no-print pointer-events-none fixed inset-x-0 z-9990 bg-primary shadow-xs"
          style={{
            top: `${underlineY}px`,
            height: "3px",
          }}
        />
      )}

      {ra.guideStyle === "band" && (
        <div
          aria-hidden="true"
          className="no-print pointer-events-none fixed inset-x-0 z-9990 border-y-2 border-primary/55 bg-primary/10"
          style={{
            top: `${bandTop}px`,
            height: `${ra.guideHeight}px`,
          }}
        />
      )}

      {/* 3. Live Text Magnifier Strip */}
      {ra.textMagnifier && magnifiedText && (
        <div
          data-a11y-magnifier="true"
          aria-hidden="true"
          className="no-print pointer-events-none fixed bottom-4 left-1/2 z-9995 w-[min(56rem,calc(100dvw-2rem))] -translate-x-1/2 rounded-xl border-2 border-primary bg-background/95 px-5 py-3.5 text-foreground shadow-2xl backdrop-blur-md"
        >
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Text Magnifier · {ra.magnifierScale.toFixed(2)}×
          </p>
          <p
            className="font-medium leading-snug text-foreground"
            style={{ fontSize: `calc(1rem * ${ra.magnifierScale})` }}
          >
            {magnifiedText}
          </p>
        </div>
      )}

      {/* 4. Floating Read Aloud Mini-Player */}
      {ra.readAloudEnabled && (
        <aside
          data-a11y-read-aloud="true"
          aria-label="Read aloud controls"
          className="no-print fixed right-4 bottom-4 z-50 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background/95 px-3 py-2 text-foreground shadow-xl backdrop-blur-md"
        >
          <Volume2
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />

          {supportsSpeech ? (
            <>
              <Button
                type="button"
                size="xs"
                variant="default"
                onClick={handlePlayPause}
                aria-label={
                  speechState === "playing"
                    ? "Pause read aloud"
                    : hasSelection && speechState === "idle"
                      ? "Read selected text aloud"
                      : "Play read aloud"
                }
              >
                {speechState === "playing" ? (
                  <>
                    <Pause className="size-3" aria-hidden="true" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="size-3" aria-hidden="true" />
                    <span>
                      {speechState === "paused"
                        ? "Resume"
                        : hasSelection
                          ? "Read Selection"
                          : "Read"}
                    </span>
                  </>
                )}
              </Button>

              {activeBlockInfo?.mode === "blocks" && (
                <>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    disabled={activeBlockInfo.index <= 0}
                    onClick={() => handleSkip(-1)}
                    aria-label="Previous paragraph"
                  >
                    <SkipBack className="size-3" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    disabled={
                      activeBlockInfo.index >= activeBlockInfo.total - 1
                    }
                    onClick={() => handleSkip(1)}
                    aria-label="Next paragraph"
                  >
                    <SkipForward className="size-3" aria-hidden="true" />
                  </Button>
                </>
              )}

              <Button
                type="button"
                size="icon-xs"
                variant="outline"
                disabled={speechState === "idle"}
                onClick={stopSpeech}
                aria-label="Stop read aloud"
              >
                <Square className="size-3" aria-hidden="true" />
              </Button>

              <span className="px-1 font-mono text-[11px] text-muted-foreground">
                {activeBlockInfo?.mode === "blocks"
                  ? `${activeBlockInfo.index + 1}/${activeBlockInfo.total} · `
                  : activeBlockInfo?.mode === "selection"
                    ? "Selection · "
                    : ""}
                {ra.readAloudRate.toFixed(2).replace(/\.00$/, "")}×
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              Speech unavailable in this browser
            </span>
          )}

          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Hide read aloud player"
            onClick={() => {
              stopSpeech();
              updateReadingAids({ readAloudEnabled: false });
            }}
          >
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        </aside>
      )}
    </>
  );
}
