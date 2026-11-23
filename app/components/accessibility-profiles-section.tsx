"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  Check,
  ClipboardCopy,
  Download,
  FileJson,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useAccessibility } from "@/app/lib/accessibility-context";
import { A11Y_PROFILES, type A11yProfileId } from "@/app/lib/a11y-profiles";
import {
  getActiveAdjustmentChips,
  type A11yPaneId,
} from "@/app/lib/a11y-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AccessibilityProfilesSectionProps {
  onNavigatePane: (pane: A11yPaneId) => void;
}

export function AccessibilityProfilesSection({
  onNavigatePane,
}: AccessibilityProfilesSectionProps) {
  const {
    settings,
    applyProfile,
    replaceSettings,
    exportSettingsJson,
    importSettingsJson,
  } = useAccessibility();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pasteId = useId();

  const [appliedProfileId, setAppliedProfileId] =
    useState<A11yProfileId | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteDraft, setPasteDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const activeChips = useMemo(
    () => getActiveAdjustmentChips(settings),
    [settings]
  );

  const handleApplyProfile = (id: A11yProfileId, name: string) => {
    applyProfile(id);
    setAppliedProfileId(id);
    setStatusMessage({
      kind: "success",
      text: `Applied "${name}". Click any active chip above or open a category on the left to fine-tune.`,
    });
  };

  const handleDownloadJson = () => {
    const json = exportSettingsJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shynotes-accessibility.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatusMessage({
      kind: "success",
      text: "Downloaded shynotes-accessibility.json.",
    });
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportSettingsJson());
      setCopied(true);
      setStatusMessage({
        kind: "success",
        text: "Copied accessibility settings JSON to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatusMessage({
        kind: "error",
        text: "Clipboard access was blocked—use Export .json instead.",
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const result = importSettingsJson(text);
      if (result.ok) {
        setAppliedProfileId(null);
        setStatusMessage({
          kind: "success",
          text: `Imported settings from ${file.name}.`,
        });
      } else {
        setStatusMessage({ kind: "error", text: result.error });
      }
    } catch {
      setStatusMessage({
        kind: "error",
        text: "Could not read that file.",
      });
    }
  };

  const handlePasteImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteDraft.trim()) return;
    const result = importSettingsJson(pasteDraft);
    if (result.ok) {
      setAppliedProfileId(null);
      setPasteDraft("");
      setShowPasteBox(false);
      setStatusMessage({
        kind: "success",
        text: "Imported accessibility settings from pasted JSON.",
      });
    } else {
      setStatusMessage({ kind: "error", text: result.error });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Active Adjustments Overview */}
      {activeChips.length > 0 && (
        <div className="space-y-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              Currently active ({activeChips.length})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Click a chip to jump · × to turn off
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center overflow-hidden rounded-full border border-border bg-background text-xs text-foreground shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => onNavigatePane(chip.pane)}
                  className="px-2.5 py-1 font-medium transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {chip.label}
                </button>
                <button
                  type="button"
                  aria-label={`Turn off ${chip.label}`}
                  onClick={() => replaceSettings(chip.clear)}
                  className="flex items-center justify-center border-l border-border px-1.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. One-Click Accessibility Profiles */}
      <div className="space-y-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <span>Quick Accessibility Profiles</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Apply a balanced starting bundle in one click—then customize
            anything individually.
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {A11Y_PROFILES.map((profile) => {
            const recentlyApplied = appliedProfileId === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => handleApplyProfile(profile.id, profile.name)}
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface/40 p-3.5 text-left transition-colors outline-none hover:border-primary/60 hover:bg-surface/80 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {profile.name}
                  </span>
                  {recentlyApplied && (
                    <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
                      <Check className="size-3" aria-hidden="true" />
                      Applied
                    </Badge>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  {profile.description}
                </p>

                <div className="flex flex-wrap gap-1 pt-0.5">
                  {profile.highlights.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {statusMessage && (
        <p
          role="status"
          className={
            statusMessage.kind === "error"
              ? "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              : "rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground"
          }
        >
          {statusMessage.text}
        </p>
      )}

      <Separator />

      {/* 3. Export & Import Settings (JSON) */}
      <div className="space-y-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <FileJson className="size-4 text-primary" aria-hidden="true" />
            <span>Backup &amp; Transfer</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Carry your exact setup between home, classroom, and library
            computers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/40 p-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDownloadJson}
          >
            <Download className="size-3.5" aria-hidden="true" />
            <span>Export .json</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopyJson}
          >
            {copied ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <ClipboardCopy className="size-3.5" aria-hidden="true" />
            )}
            <span>{copied ? "Copied" : "Copy JSON"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-3.5" aria-hidden="true" />
            <span>Import .json</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-expanded={showPasteBox}
            onClick={() => setShowPasteBox((v) => !v)}
          >
            {showPasteBox ? "Hide paste box" : "Paste JSON"}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Import accessibility settings JSON file"
          />
        </div>

        {showPasteBox && (
          <form
            onSubmit={handlePasteImport}
            className="space-y-2 rounded-xl border border-border bg-surface/40 p-3.5"
          >
            <label
              htmlFor={pasteId}
              className="block text-xs font-medium text-foreground"
            >
              Paste exported Shy Notes JSON
            </label>
            <textarea
              id={pasteId}
              rows={4}
              value={pasteDraft}
              onChange={(e) => setPasteDraft(e.target.value)}
              placeholder='{"app":"Shy Notes","settings":{...}}'
              className="w-full rounded-lg border border-input bg-background p-2.5 font-mono text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => {
                  setShowPasteBox(false);
                  setPasteDraft("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="xs" disabled={!pasteDraft.trim()}>
                Apply JSON
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
