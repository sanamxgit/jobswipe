"use client";

import { MapPin, Building2, Banknote, Clock, ExternalLink } from "lucide-react";
import type { Job } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { previewDescription, relativeTime } from "@/lib/storage";

type JobCardProps = {
  job: Job;
  style?: React.CSSProperties;
  className?: string;
  dragOverlay?: "left" | "right" | "up" | null;
  onOpenDetails?: () => void;
};

export function JobCard({
  job,
  style,
  className,
  dragOverlay,
  onOpenDetails,
}: JobCardProps) {
  const preview = previewDescription(
    job.excerpt || job.description || "",
    420
  );

  function openExternal(e: React.MouseEvent) {
    e.stopPropagation();
    if (job.applyUrl) {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    }
  }

  function openDetails(e: React.MouseEvent) {
    e.stopPropagation();
    onOpenDetails?.();
  }

  return (
    <div
      style={style}
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-pink-200/90 bg-gradient-to-b from-white via-rose-50/80 to-pink-50 shadow-xl shadow-pink-200/60",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,114,182,0.18),transparent_50%)]" />

      {dragOverlay === "right" && (
        <div className="absolute inset-0 z-20 flex items-start justify-start p-6 bg-pink-500/15">
          <span className="rotate-[-12deg] rounded-xl border-4 border-pink-500 px-4 py-2 text-2xl font-black uppercase tracking-widest text-pink-600">
            Save
          </span>
        </div>
      )}
      {dragOverlay === "left" && (
        <div className="absolute inset-0 z-20 flex items-start justify-end p-6 bg-rose-400/15">
          <span className="rotate-[12deg] rounded-xl border-4 border-rose-400 px-4 py-2 text-2xl font-black uppercase tracking-widest text-rose-500">
            Pass
          </span>
        </div>
      )}
      {dragOverlay === "up" && (
        <div className="absolute inset-0 z-20 flex items-end justify-center p-8 bg-fuchsia-400/15">
          <span className="rounded-xl border-4 border-fuchsia-500 px-4 py-2 text-2xl font-black uppercase tracking-widest text-fuchsia-600">
            Super
          </span>
        </div>
      )}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-5 sm:p-6">
        <button
          type="button"
          onClick={openDetails}
          className="mb-3 flex w-full items-start gap-3 text-left"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-pink-200 bg-white">
            {job.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.companyLogo}
                alt={job.company}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-6 w-6 text-pink-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-pink-500">
              {job.company}
            </p>
            <h2 className="mt-0.5 text-xl font-semibold leading-snug text-pink-950 sm:text-2xl">
              {job.title}
            </h2>
          </div>
          {job.applyUrl && (
            <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-pink-300" aria-hidden />
          )}
        </button>

        <div className="mb-3 flex flex-wrap gap-2 text-xs text-pink-600/90">
          <span className="inline-flex items-center gap-1 rounded-full border border-pink-100 bg-white/80 px-2.5 py-1">
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>
          {job.salary && (
            <span className="inline-flex items-center gap-1 rounded-full border border-pink-100 bg-white/80 px-2.5 py-1">
              <Banknote className="h-3.5 w-3.5" />
              {job.salary}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-pink-100 bg-white/80 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5" />
            {relativeTime(job.postedAt)}
          </span>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {job.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <p className="text-sm leading-relaxed text-pink-900/80">{preview}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openDetails}
              className="text-sm font-semibold text-pink-600 underline-offset-4 hover:text-pink-500 hover:underline"
            >
              Read full listing
            </button>
            {job.applyUrl && job.source !== "adzuna" && (
              <button
                type="button"
                onClick={openExternal}
                className="text-sm font-semibold text-fuchsia-600 underline-offset-4 hover:underline"
              >
                Open employer site ↗
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-[11px] uppercase tracking-wider text-pink-300">
          Source · {job.source}
        </p>
      </div>
    </div>
  );
}
