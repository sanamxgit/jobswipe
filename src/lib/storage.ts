import type { Job, LocationState, SavedJob, UserProfileLocal } from "@/lib/types";

const SAVED_KEY = "jobswipe_saved_v2";
const PROFILE_KEY = "jobswipe_profile_v2";
const LOCATION_KEY = "jobswipe_location_v2";
const GEO_ASKED_KEY = "jobswipe_geo_asked_v2";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSavedJobs(): SavedJob[] {
  return readJson<SavedJob[]>(SAVED_KEY, []);
}

export function saveJobLocal(
  job: Job,
  interest: "saved" | "super" = "saved"
): SavedJob[] {
  const existing = getSavedJobs().filter((s) => s.job.id !== job.id);
  const next: SavedJob[] = [
    {
      id: job.id,
      job: { ...job, interest },
      interest,
      savedAt: new Date().toISOString(),
    },
    ...existing,
  ];
  writeJson(SAVED_KEY, next);
  return next;
}

export function removeSavedJob(jobId: string): SavedJob[] {
  const next = getSavedJobs().filter((s) => s.job.id !== jobId);
  writeJson(SAVED_KEY, next);
  return next;
}

export function updateSavedCoverLetter(
  jobId: string,
  coverLetter: string
): SavedJob[] {
  const next = getSavedJobs().map((s) =>
    s.job.id === jobId ? { ...s, coverLetter } : s
  );
  writeJson(SAVED_KEY, next);
  return next;
}

export function getProfile(): UserProfileLocal {
  return readJson<UserProfileLocal>(PROFILE_KEY, {
    email: "",
    fullName: "",
    locationLabel: "United Kingdom",
  });
}

export function saveProfile(profile: UserProfileLocal) {
  writeJson(PROFILE_KEY, profile);
}

export function getStoredLocation(): LocationState | null {
  return readJson<LocationState | null>(LOCATION_KEY, null);
}

export function setStoredLocation(location: LocationState) {
  writeJson(LOCATION_KEY, location);
}

export function hasAskedGeo(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GEO_ASKED_KEY) === "1";
}

export function markGeoAsked() {
  if (typeof window === "undefined") return;
  localStorage.setItem(GEO_ASKED_KEY, "1");
}

export function relativeTime(iso?: string | null): string {
  if (!iso) return "Recently";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Recently";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function getPassedJobIds(): string[] {
  return readJson<string[]>("jobswipe_passed_v2", []);
}

export function addPassedJobId(jobId: string) {
  const ids = new Set(getPassedJobIds());
  ids.add(jobId);
  writeJson("jobswipe_passed_v2", [...ids].slice(-400));
}

export function removePassedJobId(jobId: string) {
  writeJson(
    "jobswipe_passed_v2",
    getPassedJobIds().filter((id) => id !== jobId)
  );
}

export function getSavedJobIds(): string[] {
  return getSavedJobs().map((s) => s.job.id);
}

export function previewDescription(text: string, max = 380): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}
