"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Accessibility,
  ArrowRight,
  BookOpen,
  Focus,
  MousePointerClick,
  Palette,
  RotateCcw,
  Search,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import { useAccessibility } from "@/app/lib/accessibility-context";
import {
  PANE_LABELS,
  SEARCHABLE_SETTINGS,
  getActiveAdjustmentChips,
  getPaneActiveCounts,
  type A11yPaneId,
} from "@/app/lib/a11y-catalog";
import { AccessibilityProfilesSection } from "@/app/components/accessibility-profiles-section";
import { AccessibilityColorLightSection } from "@/app/components/accessibility-color-light-section";
import { AccessibilityTypographySection } from "@/app/components/accessibility-typography-section";
import { AccessibilityFocusSection } from "@/app/components/accessibility-focus-section";
import { AccessibilityReadingSection } from "@/app/components/accessibility-reading-section";
import { AccessibilityNavigationSection } from "@/app/components/accessibility-navigation-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PANES: {
  id: A11yPaneId;
  label: string;
  icon: typeof Palette;
}[] = [
  { id: "overview", label: PANE_LABELS.overview, icon: Sparkles },
  { id: "color-light", label: PANE_LABELS["color-light"], icon: Palette },
  { id: "text", label: PANE_LABELS.text, icon: Type },
  { id: "focus", label: PANE_LABELS.focus, icon: Focus },
  { id: "tools", label: PANE_LABELS.tools, icon: BookOpen },
  { id: "navigation", label: PANE_LABELS.navigation, icon: MousePointerClick },
];

interface AccessibilityModalProps {
  open: boolean;
  onClose: () => void;
}

export function AccessibilityModal({ open, onClose }: AccessibilityModalProps) {
  const { settings, hasCustomizations, resetSettings } = useAccessibility();
  const [activePane, setActivePane] = useState<A11yPaneId>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const searchId = useId();

  const activeChips = useMemo(
    () => getActiveAdjustmentChips(settings),
    [settings]
  );
  const paneCounts = useMemo(
    () => getPaneActiveCounts(activeChips),
    [activeChips]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SEARCHABLE_SETTINGS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q) ||
        item.paneLabel.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const navigateToPane = (pane: A11yPaneId) => {
    setActivePane(pane);
    setSearchQuery("");
    contentRef.current?.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      setSearchQuery("");
      onClose();
    };

    dialog.addEventListener("close", handleClose);

    // Light-dismiss fallback for browsers without native closedby="any"
    let cleanupOutside: (() => void) | undefined;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupOutside = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      cleanupOutside?.();
    };
  }, [onClose]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as Record<string, string>)}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="a11y-modal no-print fixed top-1/2 right-auto bottom-auto left-1/2 m-0 w-[min(52rem,calc(100dvw-2rem))] max-w-[calc(100dvw-2rem)] max-h-[min(88dvh,48rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-background p-0 text-foreground shadow-2xl open:flex open:flex-col backdrop:bg-black/75 backdrop:backdrop-blur-xs"
    >
      {/* Fixed Modal Header with Integrated Quick Find */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <Accessibility className="size-4" />
          </span>
          <div>
            <h2
              id={titleId}
              className="text-base font-semibold tracking-tight text-foreground"
            >
              Accessibility
            </h2>
            <p id={descId} className="text-xs text-muted-foreground">
              Tailor color, text, focus, reading tools, and input
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
          <div className="relative w-full max-w-56">
            <label htmlFor={searchId} className="sr-only">
              Find an accessibility setting
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={searchId}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a setting…"
              className="h-8 pr-7 pl-8 text-xs"
            />
            {isSearching && (
              <button
                type="button"
                aria-label="Clear setting search"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <form method="dialog">
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              autoFocus
              aria-label="Close Accessibility Settings"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </div>

      {/* Sectioned Body: Left Sidebar Rail (desktop) / Top Bar (mobile) + Scrollable Content */}
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <nav
          aria-label="Accessibility categories"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface/40 p-2.5 sm:w-52 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0 sm:p-3"
        >
          {PANES.map((pane) => {
            const Icon = pane.icon;
            const active = !isSearching && activePane === pane.id;
            const count =
              pane.id === "overview" ? activeChips.length : paneCounts[pane.id];

            return (
              <button
                key={pane.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => navigateToPane(pane.id)}
                className={cn(
                  "flex h-9 shrink-0 items-center justify-between gap-2 rounded-lg px-2.5 text-left text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-full",
                  active
                    ? "bg-background text-foreground shadow-2xs ring-1 ring-border"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{pane.label}</span>
                </span>
                {pane.id !== "overview" && count > 0 && (
                  <Badge
                    variant={active ? "default" : "secondary"}
                    className="h-4 min-w-4 justify-center px-1 font-mono text-[10px]"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto p-5">
          {isSearching ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Matching settings ({searchResults.length})
                </h3>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => setSearchQuery("")}
                >
                  Back to {PANE_LABELS[activePane]}
                </Button>
              </div>

              {searchResults.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface/40 p-4 text-xs text-muted-foreground">
                  No settings match &ldquo;{searchQuery}&rdquo;. Try searching
                  for terms like{" "}
                  <span className="font-medium text-foreground">cursor</span>,{" "}
                  <span className="font-medium text-foreground">italics</span>,{" "}
                  <span className="font-medium text-foreground">dimmer</span>,{" "}
                  <span className="font-medium text-foreground">voice</span>, or{" "}
                  <span className="font-medium text-foreground">44px</span>.
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateToPane(item.pane)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3.5 text-left transition-colors hover:border-primary/60 hover:bg-surface/80 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {item.title}
                          </span>
                          <Badge
                            variant="secondary"
                            className="h-4 px-1.5 text-[10px]"
                          >
                            {item.paneLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <ArrowRight
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {activePane === "overview" && (
                <AccessibilityProfilesSection onNavigatePane={navigateToPane} />
              )}
              {activePane === "color-light" && (
                <AccessibilityColorLightSection
                  activeCount={paneCounts["color-light"]}
                />
              )}
              {activePane === "text" && (
                <AccessibilityTypographySection activeCount={paneCounts.text} />
              )}
              {activePane === "focus" && (
                <AccessibilityFocusSection activeCount={paneCounts.focus} />
              )}
              {activePane === "tools" && (
                <AccessibilityReadingSection activeCount={paneCounts.tools} />
              )}
              {activePane === "navigation" && (
                <AccessibilityNavigationSection
                  activeCount={paneCounts.navigation}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/40 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!hasCustomizations}
            onClick={resetSettings}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Reset all</span>
          </Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {activeChips.length > 0
              ? `${activeChips.length} active ${activeChips.length === 1 ? "adjustment" : "adjustments"} · Saved in this browser`
              : "Default settings · Saved automatically"}
          </span>
        </div>

        <form method="dialog">
          <Button type="submit" size="sm">
            Done
          </Button>
        </form>
      </div>
    </dialog>
  );
}
