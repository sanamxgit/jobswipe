import { createHash } from "crypto";
import { spawn } from "child_process";
import path from "path";
import type { Job, JobSource, LocationState } from "@/lib/types";

export type JobSpyScrapeOptions = {
  topic: string;
  location?: LocationState;
  resultsWanted?: number;
  hoursOld?: number;
};

type JobSpyRow = {
  site?: string;
  title?: string;
  company?: string;
  company_name?: string;
  company_logo?: string;
  location?: string;
  description?: string;
  job_url?: string;
  job_type?: string;
  interval?: string;
  min_amount?: number;
  max_amount?: number;
  currency?: string;
  date_posted?: string;
  emails?: string;
  is_remote?: boolean;
};

const SITE_SOURCES: Record<string, JobSource> = {
  indeed: "indeed",
  linkedin: "linkedin",
  glassdoor: "glassdoor",
  google: "google",
  zip_recruiter: "zip_recruiter",
};

function resolvePythonCommand(): { command: string; prefixArgs: string[] } {
  const configured = process.env.JOBSPY_PYTHON?.trim();
  if (configured) {
    const parts = configured.split(/\s+/).filter(Boolean);
    return { command: parts[0], prefixArgs: parts.slice(1) };
  }
  if (process.platform === "win32") {
    return { command: "py", prefixArgs: ["-3.12"] };
  }
  return { command: "python3", prefixArgs: [] };
}

function resolveScriptPath(): string {
  return (
    process.env.JOBSPY_SCRIPT?.trim() ||
    path.join(process.cwd(), "scripts", "jobspy_scrape.py")
  );
}

function parseSites(): string[] {
  const raw =
    process.env.JOBSPY_SITES?.trim() || "indeed,linkedin,glassdoor";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatSalary(row: JobSpyRow): string | null {
  const min = row.min_amount;
  const max = row.max_amount;
  if (min == null && max == null) return null;
  const currency = row.currency === "GBP" || !row.currency ? "£" : `${row.currency} `;
  const low = min ?? max;
  const high = max ?? min;
  if (low == null) return null;
  const fmt = (n: number) =>
    currency === "£"
      ? `£${Math.round(n).toLocaleString("en-GB")}`
      : `${currency}${Math.round(n).toLocaleString()}`;
  if (high != null && min != null && max !== min) {
    return `${fmt(low)} – ${fmt(high)}${row.interval ? ` / ${row.interval}` : ""}`;
  }
  return `${fmt(low)}${row.interval ? ` / ${row.interval}` : ""}`;
}

function mapSiteSource(site?: string): JobSource {
  if (!site) return "indeed";
  return SITE_SOURCES[site.toLowerCase()] ?? "indeed";
}

function jobIdFor(row: JobSpyRow): string {
  const site = row.site || "jobspy";
  const key = row.job_url || `${row.title}|${row.company}|${row.location}`;
  const hash = createHash("sha1").update(key).digest("hex").slice(0, 12);
  return `${site}-${hash}`;
}

function buildLocationLabel(loc?: LocationState): string {
  if (!loc) return "United Kingdom";
  if (loc.city) return loc.city;
  if (loc.label && loc.label !== "United Kingdom") return loc.label;
  return "United Kingdom";
}

function mapRowToJob(row: JobSpyRow): Job {
  const description = (row.description || "").trim();
  const source = mapSiteSource(row.site);
  const company = row.company || row.company_name || "Company";
  const location =
    row.location?.trim() ||
    (row.is_remote ? "Remote · UK" : "United Kingdom");

  const tags = [
    source === "indeed"
      ? "Indeed"
      : source === "linkedin"
        ? "LinkedIn"
        : source === "glassdoor"
          ? "Glassdoor"
          : source,
    "UK",
  ];
  if (row.is_remote) tags.push("Remote");
  if (row.job_type) tags.push(row.job_type);

  const email =
    row.emails?.split(/,\s*/).find((e) => e.includes("@")) ?? null;

  return {
    id: jobIdFor(row),
    title: row.title?.trim() || "Untitled role",
    company,
    companyLogo: row.company_logo ?? null,
    location,
    description,
    excerpt: description.slice(0, 380),
    employmentType: row.job_type ?? undefined,
    salary: formatSalary(row),
    tags,
    applyUrl: row.job_url ?? null,
    contactEmail: email,
    postedAt: row.date_posted ?? null,
    source,
  };
}

function runJobSpyScript(payload: object): Promise<{ jobs: JobSpyRow[]; error?: string }> {
  return new Promise((resolve, reject) => {
    const { command, prefixArgs } = resolvePythonCommand();
    const script = resolveScriptPath();
    const timeoutMs = Number(process.env.JOBSPY_TIMEOUT_MS || 120_000);

    const child = spawn(command, [...prefixArgs, script], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`JobSpy timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(stdout || "{}") as {
          jobs?: JobSpyRow[];
          error?: string;
        };
        if (parsed.error) {
          resolve({ jobs: [], error: parsed.error });
          return;
        }
        if (code !== 0 && !parsed.jobs?.length) {
          resolve({
            jobs: [],
            error: stderr.trim() || `JobSpy exited with code ${code}`,
          });
          return;
        }
        resolve({ jobs: parsed.jobs ?? [] });
      } catch {
        reject(
          new Error(
            stderr.trim() ||
              stdout.slice(0, 200) ||
              `JobSpy failed (exit ${code})`
          )
        );
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export function isJobSpyEnabled(): boolean {
  if (process.env.JOBSPY_ENABLED === "false") return false;
  return true;
}

export async function fetchJobSpyJobs(
  options: JobSpyScrapeOptions
): Promise<Job[]> {
  if (!isJobSpyEnabled()) return [];

  const location = buildLocationLabel(options.location);
  const resultsWanted = Number(
    process.env.JOBSPY_RESULTS ?? options.resultsWanted ?? 15
  );
  const hoursOld = Number(
    process.env.JOBSPY_HOURS_OLD ?? options.hoursOld ?? 168
  );

  const payload = {
    search_term: options.topic,
    location,
    results_wanted: resultsWanted,
    hours_old: hoursOld,
    country_indeed: "UK",
    sites: parseSites(),
    linkedin_fetch_description: process.env.JOBSPY_LINKEDIN_DESCRIPTION !== "false",
  };

  const { jobs, error } = await runJobSpyScript(payload);
  if (error) {
    throw new Error(error);
  }

  return jobs.map(mapRowToJob).filter((j) => j.title && j.applyUrl);
}
