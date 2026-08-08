"use client";

import { Bookmark, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type SwipeButtonsProps = {
  onPass: () => void;
  onSave: () => void;
  onSuper: () => void;
  onUndo?: () => void;
  disabled?: boolean;
  canUndo?: boolean;
};

export function SwipeButtons({
  onPass,
  onSave,
  onSuper,
  onUndo,
  disabled,
  canUndo,
}: SwipeButtonsProps) {
  return (
    <div className="relative flex items-center justify-center gap-4 py-2">
      <Button
        type="button"
        variant="danger"
        size="icon"
        disabled={disabled}
        onClick={onPass}
        aria-label="Pass"
        className="h-14 w-14"
      >
        <X className="h-6 w-6" />
      </Button>

      <Button
        type="button"
        variant="favorite"
        size="icon"
        disabled={disabled}
        onClick={onSuper}
        aria-label="Super save"
        className="h-12 w-12"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      <Button
        type="button"
        variant="save"
        size="icon"
        disabled={disabled}
        onClick={onSave}
        aria-label="Save"
        className="h-14 w-14"
      >
        <Bookmark className="h-6 w-6 fill-current" />
      </Button>

      {onUndo && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Undo"
          className="h-10 w-10"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
