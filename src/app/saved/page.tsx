"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import type { SavedJob } from "@/lib/types";
import {
  getProfile,
  getSavedJobs,
  removeSavedJob,
  updateSavedCoverLetter,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { relativeTime } from "@/lib/storage";

export default function SavedPage() {
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [active, setActive] = useState<SavedJob | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [mode, setMode] = useState<"view" | "letter" | "apply">("view");

  function refresh() {
    setSaved(getSavedJobs());
  }

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("jobswipe:saved-updated", onUpdate);
    return () => window.removeEventListener("jobswipe:saved-updated", onUpdate);
  }, []);

  function openJob(item: SavedJob) {
    setActive(item);
    setCoverLetter(item.coverLetter || "");
    setMode("view");
  }

  async function generateLetter(item: SavedJob, forApply = false) {
    const profile = getProfile();
    if (!profile.email) {
      toast.error("Add your email on the Profile page first");
      return;
    }

    setActive(item);
    setGenerating(true);
    setMode(forApply ? "apply" : "letter");
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: item.job,
          applicantName: profile.fullName,
          applicantEmail: profile.email,
          cvFileName: profile.cvFileName,
        }),
      });
      const data = (await res.json()) as {
        coverLetter?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Generation failed");
      const letter = data.coverLetter || "";
      setCoverLetter(letter);
      updateSavedCoverLetter(item.job.id, letter);
      refresh();
      toast.success("Cover letter ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate");
    } finally {
      setGenerating(false);
    }
  }

  async function applyNow(item: SavedJob) {
    const profile = getProfile();
    if (!profile.email) {
      toast.error("Add your email on the Profile page first");
      return;
    }
    if (!profile.cvDataUrl) {
      toast.message("No CV uploaded", {
        description:
          "You can still apply — upload a CV on Profile for attachments.",
      });
    }

    setActive(item);
    setApplying(true);
    setMode("apply");
    try {
      let letter = item.coverLetter || coverLetter;
      if (active?.job.id === item.job.id && coverLetter.trim()) {
        letter = coverLetter;
      }
      if (!letter.trim()) {
        setGenerating(true);
        const res = await fetch("/api/cover-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job: item.job,
            applicantName: profile.fullName,
            applicantEmail: profile.email,
            cvFileName: profile.cvFileName,
          }),
        });
        const data = (await res.json()) as {
          coverLetter?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Generation failed");
        letter = data.coverLetter || "";
        setCoverLetter(letter);
        updateSavedCoverLetter(item.job.id, letter);
        setGenerating(false);
      } else {
        setCoverLetter(letter);
      }

      const applyRes = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: item.job,
          coverLetter: letter,
          fromEmail: profile.email,
          fromName: profile.fullName,
          toEmail: item.job.contactEmail,
          cvFileName: profile.cvFileName,
          cvDataUrl: profile.cvDataUrl,
        }),
      });
      const applyData = (await applyRes.json()) as {
        sent?: boolean;
        mailto?: string | null;
        applyUrl?: string | null;
        message?: string;
        to?: string | null;
        error?: string;
      };

      if (!applyRes.ok && !applyData.mailto) {
        throw new Error(applyData.error || "Apply failed");
      }

      if (applyData.sent) {
        toast.success("Application email sent!");
      } else {
        toast.message(applyData.message || "Ready to apply", {
          description: applyData.to
            ? `To: ${applyData.to}`
            : "No hiring email — use listing or copy letter",
        });
        if (applyData.mailto) {
          window.open(applyData.mailto, "_blank");
        } else if (applyData.applyUrl) {
          window.open(applyData.applyUrl, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
      setGenerating(false);
    } finally {
      setApplying(false);
    }
  }

  function remove(id: string) {
    removeSavedJob(id);
    refresh();
    window.dispatchEvent(new Event("jobswipe:saved-updated"));
    if (active?.job.id === id) setActive(null);
    toast.success("Removed");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-pink-950">Saved jobs</h1>
      <p className="mb-4 text-sm text-pink-500">
        {saved.length} saved · Generate a cover letter and apply when you&apos;re
        ready
      </p>

      {(!getProfile().email || !getProfile().cvFileName) && (
        <div className="mb-6 rounded-2xl border border-pink-200 bg-pink-50/80 px-4 py-3 text-sm text-pink-700">
          Tip: add your{" "}
          <Link href="/profile" className="font-semibold underline">
            email &amp; CV on Profile
          </Link>{" "}
          before applying — cover letters and attachments use them.
        </div>
      )}

      {saved.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-pink-200 bg-white/70 p-10 text-center text-sm text-pink-500">
          <Bookmark className="mx-auto mb-3 h-8 w-8 text-pink-300" />
          Swipe right to save roles.{" "}
          <Link href="/" className="font-medium text-pink-600 underline">
            Back to swipe
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {saved.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-pink-100 bg-white/80 p-4 shadow-sm shadow-pink-100"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openJob(item)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-pink-500">{item.job.company}</p>
                    {item.interest === "super" && (
                      <Badge variant="default">Super</Badge>
                    )}
                  </div>
                  <h2 className="font-medium text-pink-950">{item.job.title}</h2>
                  <p className="mt-1 text-xs text-pink-400">
                    {item.job.location}
                    {item.job.salary ? ` · ${item.job.salary}` : ""} ·{" "}
                    {relativeTime(item.job.postedAt)}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(item.job.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void generateLetter(item)}
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Best Cover Letter
                </Button>
                <Button size="sm" onClick={() => void applyNow(item)}>
                  <Send className="h-4 w-4" />
                  Apply Now
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!active}
        onOpenChange={(open) => !open && setActive(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{active?.job.title}</DialogTitle>
            <DialogDescription>
              {active?.job.company} · {active?.job.location}
            </DialogDescription>
          </DialogHeader>

          {mode === "view" && (
            <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-pink-900/80">
              {active?.job.description}
            </div>
          )}

          {(mode === "letter" || mode === "apply") && (
            <div className="space-y-2">
              {generating ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-pink-400">
                  <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
                  Writing your letter…
                </div>
              ) : (
                <textarea
                  value={coverLetter}
                  onChange={(e) => {
                    setCoverLetter(e.target.value);
                    if (active) {
                      updateSavedCoverLetter(active.job.id, e.target.value);
                    }
                  }}
                  className="min-h-56 w-full resize-y rounded-2xl border border-pink-200 bg-rose-50/40 p-4 text-sm leading-relaxed text-pink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50"
                  placeholder="Your cover letter…"
                />
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={generating || !active}
                onClick={() => active && void generateLetter(active)}
              >
                <FileText className="h-4 w-4" />
                Cover letter
              </Button>
              <Button
                size="sm"
                disabled={generating || applying || !active}
                onClick={() => active && void applyNow(active)}
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Apply Now
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {coverLetter && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(coverLetter);
                    toast.success("Letter copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              )}
              {active?.job.applyUrl && (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={active.job.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                  {active?.job.source === "adzuna" ? "Adzuna" : "Listing"}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
