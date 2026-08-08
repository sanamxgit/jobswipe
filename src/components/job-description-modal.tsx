"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/lib/types";
import { ExternalLink, Bookmark, Sparkles } from "lucide-react";
import { relativeTime } from "@/lib/storage";

type JobDescriptionModalProps = {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  onSuper?: () => void;
};

export function JobDescriptionModal({
  job,
  open,
  onOpenChange,
  onSave,
  onSuper,
}: JobDescriptionModalProps) {
  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{job.title}</DialogTitle>
          <DialogDescription>
            {job.company} · {job.location}
            {job.salary ? ` · ${job.salary}` : ""} · {relativeTime(job.postedAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {job.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="max-h-[45vh] space-y-3 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-pink-900/80">
          {job.description || "No description available."}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {onSuper && (
              <Button variant="favorite" size="sm" onClick={onSuper}>
                <Sparkles className="h-4 w-4" />
                Super
              </Button>
            )}
            {onSave && (
              <Button size="sm" onClick={onSave}>
                <Bookmark className="h-4 w-4" />
                Save
              </Button>
            )}
          </div>
          {job.applyUrl && (
            <Button asChild variant="secondary" size="sm">
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                {job.source === "adzuna" ? "View on Adzuna" : "Open listing"}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
