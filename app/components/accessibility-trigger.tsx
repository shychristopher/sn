"use client";

import { Accessibility } from "lucide-react";
import { useAccessibility } from "@/app/lib/accessibility-context";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AccessibilityTriggerProps {
  compact?: boolean;
}

export function AccessibilityTrigger({
  compact = false,
}: AccessibilityTriggerProps) {
  const { openModal, hasCustomizations } = useAccessibility();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={compact ? "icon-sm" : "sm"}
            onClick={openModal}
            aria-label={
              hasCustomizations
                ? "Open Accessibility Settings (custom settings active)"
                : "Open Accessibility Settings"
            }
            aria-haspopup="dialog"
            className="relative gap-1.5"
          />
        }
      >
        <Accessibility className="size-4 shrink-0" aria-hidden="true" />
        {!compact && <span className="hidden sm:inline">Accessibility</span>}
        {hasCustomizations && (
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-primary"
          />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">Accessibility Settings</TooltipContent>
    </Tooltip>
  );
}
