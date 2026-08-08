"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2, SearchX } from "lucide-react";
import { toast } from "sonner";
import type { Job, LocationState, SwipeDirection } from "@/lib/types";
import { SwipeCard } from "@/components/swipe/swipe-card";
import { SwipeButtons } from "@/components/swipe/swipe-buttons";
import { JobCard } from "@/components/swipe/job-card";
import { JobDescriptionModal } from "@/components/job-description-modal";
import { isCyberTopic } from "@/lib/constants";
import {
  addPassedJobId,
  getPassedJobIds,
  getSavedJobIds,
  removePassedJobId,
  saveJobLocal,
} from "@/lib/storage";

type SwipeDeckProps = {
  query: string;
  location: LocationState | null;
};

type SourceInfo = { name: string; count: number; ok: boolean };

export function SwipeDeck({ query, location }: SwipeDeckProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Job[]>([]);
  const [detailsJob, setDetailsJob] = useState<Job | null>(null);
  const [sources, setSources] = useState<SourceInfo[]>([]);

  const current = jobs[index] ?? null;
  const next = jobs[index + 1] ?? null;

  useEffect(() => {
    if (!location) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setIndex(0);
      setHistory([]);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          city: location!.city || "",
          label: location!.label || "United Kingdom",
        });
        const res = await fetch(`/api/jobs?${params}`);
        const data = (await res.json()) as {
          jobs: Job[];
          sources?: SourceInfo[];
          query?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Failed to load");

        const skip = new Set([
          ...getPassedJobIds(),
          ...getSavedJobIds(),
        ]);
        const filtered = (data.jobs ?? []).filter((j) => !skip.has(j.id));

        if (!cancelled) {
          setJobs(filtered);
          setSources(data.sources ?? []);
          if (data.error) {
            toast.message("Job source note", {
              description: data.error.slice(0, 120),
            });
          }
        }
      } catch {
        if (!cancelled) {
          setJobs([]);
          toast.error("Could not load jobs");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [query, location]);

  const persistSave = useCallback(
    (job: Job, interest: "saved" | "super") => {
      saveJobLocal(job, interest);
      toast.success(interest === "super" ? "Super saved ✨" : "Saved", {
        description: "Find it on the Saved page to apply.",
      });
      window.dispatchEvent(new Event("jobswipe:saved-updated"));
    },
    []
  );

  const advance = useCallback(
    (direction: SwipeDirection) => {
      const job = jobs[index];
      if (!job) return;
      setHistory((h) => [...h, job]);

      if (direction === "right") persistSave(job, "saved");
      if (direction === "up") persistSave(job, "super");
      if (direction === "left") {
        addPassedJobId(job.id);
        toast("Passed", { duration: 800 });
      }

      setIndex((i) => i + 1);
    },
    [jobs, index, persistSave]
  );

  const undo = useCallback(() => {
    if (!history.length || index === 0) return;
    const last = history[history.length - 1];
    removePassedJobId(last.id);
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
  }, [history, index]);

  const cyberFeed = isCyberTopic(query);

  if (!location || loading) {
    return (
      <div className="flex h-[620px] flex-col items-center justify-center gap-3 text-pink-400">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        <p className="text-sm">
          Finding {cyberFeed ? "cyber security" : `"${query}"`} roles…
        </p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex h-[620px] flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-pink-200 bg-white/60 px-6 text-center">
        <SearchX className="h-10 w-10 text-pink-300" />
        <h3 className="text-lg font-semibold text-pink-900">Deck empty</h3>
        <p className="max-w-sm text-sm text-pink-500">
          No more jobs for this search/location. Try another city or topic — or
          clear passed roles by refreshing after a while.
        </p>
      </div>
    );
  }

  const liveSources = sources.filter((s) => s.count > 0);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
        <span className="rounded-full border border-pink-100 bg-pink-50 px-2.5 py-0.5 text-[11px] text-pink-600">
          {cyberFeed ? "UK cyber feed" : `"${query}" · UK jobs`}
        </span>
        {liveSources.map((s) => (
          <span
            key={s.name}
            className="rounded-full border border-pink-100 bg-white px-2.5 py-0.5 text-[11px] text-pink-500"
          >
            {s.name} · {s.count}
          </span>
        ))}
      </div>

      <div className="relative mx-auto h-[620px] w-full">
        <AnimatePresence mode="popLayout">
          {next && (
            <div
              key={`next-${next.id}`}
              className="absolute inset-0 scale-[0.96] opacity-70"
            >
              <JobCard job={next} />
            </div>
          )}
          <SwipeCard
            key={current.id}
            job={current}
            active
            onSwipe={advance}
            onOpenDetails={() => setDetailsJob(current)}
          />
        </AnimatePresence>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-center text-xs text-pink-400">
          ← Pass · ↑ Super · Save → · {Math.min(index + 1, jobs.length)} /{" "}
          {jobs.length}
        </p>
        <SwipeButtons
          onPass={() => advance("left")}
          onSave={() => advance("right")}
          onSuper={() => advance("up")}
          onUndo={undo}
          canUndo={history.length > 0}
        />
      </div>

      <JobDescriptionModal
        job={detailsJob}
        open={!!detailsJob}
        onOpenChange={(open) => !open && setDetailsJob(null)}
        onSave={() => {
          if (detailsJob) {
            setDetailsJob(null);
            advance("right");
          }
        }}
        onSuper={() => {
          if (detailsJob) {
            setDetailsJob(null);
            advance("up");
          }
        }}
      />
    </div>
  );
}
