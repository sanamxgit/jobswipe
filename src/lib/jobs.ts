import type { Job, LocationState } from "@/lib/types";
import { DEFAULT_TOPIC, isCyberTopic } from "@/lib/constants";
import { fetchGoogleCustomSearchJobs, buildGoogleJobsQuery } from "@/lib/google-search";
import { fetchJobSpyJobs, isJobSpyEnabled } from "@/lib/jobspy";

/** Adzuna tracking URLs (jobs/land/ad/…) often hit Access Denied on employer sites. */
function adzunaListingUrl(jobId: string | number): string {
  return `https://www.adzuna.co.uk/details/${jobId}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEmail(text: string): string | null {
  const match = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  return match?.[0] ?? null;
}

function hoursAgo(iso?: string | null): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return (Date.now() - t) / (1000 * 60 * 60);
}

function isStrongCyberTitle(title: string): boolean {
  return /cyber|security|infosec|soc\b|penetration|pentest|ciso|grc|appsec|devsecops|blue team|red team|threat|vulnerability|iso\s*27001|information security/i.test(
    title
  );
}

function isEnglishUkFriendly(job: Job): boolean {
  const loc = job.location.toLowerCase();
  const title = job.title.toLowerCase();
  // Drop clearly non-UK local markets
  if (
    /germany|deutschland|berlin|münchen|munich|dingolfing|düsseldorf|dusseldorf|france|paris|netherlands|amsterdam|spain|madrid|italy|poland|warsaw|\(m\/w\/d\)|\(m\/w\/x\)/i.test(
      `${loc} ${title}`
    )
  ) {
    return false;
  }
  return true;
}

function isUkRelevant(job: Job, locationHint: string): boolean {
  const hay = `${job.location} ${job.title} ${job.description} ${job.tags.join(" ")}`.toLowerCase();
  const ukSignals =
    hay.includes("uk") ||
    hay.includes("united kingdom") ||
    hay.includes("london") ||
    hay.includes("manchester") ||
    hay.includes("birmingham") ||
    hay.includes("leeds") ||
    hay.includes("glasgow") ||
    hay.includes("edinburgh") ||
    hay.includes("bristol") ||
    hay.includes("remote uk") ||
    hay.includes("england") ||
    hay.includes("scotland") ||
    hay.includes("wales") ||
    hay.includes("britain");

  if (ukSignals) return true;
  if (locationHint && hay.includes(locationHint.toLowerCase())) return true;

  if (
    hay.includes("remote") ||
    hay.includes("worldwide") ||
    hay.includes("anywhere") ||
    hay.includes("emea")
  ) {
    return true;
  }

  return false;
}

function matchesTopic(job: Job, topic: string): boolean {
  if (!topic.trim()) return true;
  const hay = `${job.title} ${job.company} ${job.description} ${job.tags.join(" ")}`.toLowerCase();
  return topic
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term) || term === "uk" || term === "united");
}

async function fetchAdzuna(
  what: string,
  where: string
): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const url =
    `https://api.adzuna.com/v1/api/jobs/gb/search/1?` +
    new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: "40",
      what,
      where: where || "uk",
      sort_by: "date",
      max_days_old: "7",
    });

  const res = await fetch(url, { next: { revalidate: 300 } });
  const text = await res.text();
  let data: {
    exception?: string;
    display?: string;
    results?: Array<{
      id: number | string;
      title?: string;
      description?: string;
      created?: string;
      redirect_url?: string;
      salary_min?: number;
      salary_max?: number;
      company?: { display_name?: string };
      location?: { display_name?: string };
      contract_time?: string;
      category?: { label?: string };
    }>;
  };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Adzuna returned invalid response (HTTP ${res.status}) — try again shortly`
    );
  }

  if (!res.ok || data.exception) {
    const detail = data.display || data.exception || `HTTP ${res.status}`;
    throw new Error(
      data.exception === "AUTH_FAIL"
        ? `Adzuna auth failed — check ADZUNA_APP_ID and ADZUNA_APP_KEY (${detail})`
        : `Adzuna ${detail}`
    );
  }

  return (data.results ?? []).map((j) => {
    const description = j.description ? stripHtml(j.description) : "";
    const salary =
      j.salary_min || j.salary_max
        ? `£${Math.round(j.salary_min || j.salary_max || 0).toLocaleString("en-GB")}${
            j.salary_max && j.salary_min && j.salary_max !== j.salary_min
              ? ` – £${Math.round(j.salary_max).toLocaleString("en-GB")}`
              : ""
          }`
        : null;
    return {
      id: `adzuna-${j.id}`,
      title: j.title ?? "Untitled role",
      company: j.company?.display_name ?? "Company confidential",
      location: j.location?.display_name
        ? `${j.location.display_name}, UK`
        : "United Kingdom",
      description,
      excerpt: description.slice(0, 380),
      employmentType: j.contract_time,
      salary,
      tags: [j.category?.label, "Adzuna", "UK"].filter(Boolean) as string[],
      applyUrl: adzunaListingUrl(j.id),
      contactEmail: extractEmail(description),
      postedAt: j.created ?? null,
      source: "adzuna" as const,
    };
  });
}

async function fetchReed(keywords: string, location: string): Promise<Job[]> {
  const key = process.env.REED_API_KEY;
  if (!key) return [];

  const url =
    `https://www.reed.co.uk/api/1.0/search?` +
    new URLSearchParams({
      keywords,
      locationName: location || "London",
      resultsToTake: "30",
      distanceFromLocation: "50",
    });

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Reed ${res.status}`);
  const data = (await res.json()) as {
    results?: Array<{
      jobId: number;
      jobTitle?: string;
      employerName?: string;
      locationName?: string;
      jobDescription?: string;
      minimumSalary?: number;
      maximumSalary?: number;
      date?: string;
      jobUrl?: string;
      expirationDate?: string;
    }>;
  };

  return (data.results ?? []).map((j) => {
    const description = j.jobDescription
      ? stripHtml(j.jobDescription)
      : "";
    const salary =
      j.minimumSalary || j.maximumSalary
        ? `£${(j.minimumSalary || j.maximumSalary || 0).toLocaleString("en-GB")}${
            j.maximumSalary && j.minimumSalary !== j.maximumSalary
              ? ` – £${j.maximumSalary.toLocaleString("en-GB")}`
              : ""
          }`
        : null;
    return {
      id: `reed-${j.jobId}`,
      title: j.jobTitle ?? "Untitled role",
      company: j.employerName ?? "Employer",
      location: j.locationName ? `${j.locationName}, UK` : "UK",
      description,
      excerpt: description.slice(0, 380),
      salary,
      tags: ["Reed", "UK"],
      applyUrl: j.jobUrl ?? `https://www.reed.co.uk/jobs/${j.jobId}`,
      contactEmail: extractEmail(description),
      postedAt: j.date ?? null,
      source: "reed" as const,
    };
  });
}

async function fetchRemotive(search: string): Promise<Job[]> {
  const url = `https://remotive.com/api/remote-jobs?category=software-dev&search=${encodeURIComponent(
    search
  )}&limit=40`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Remotive ${res.status}`);
  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      url?: string;
      title?: string;
      company_name?: string;
      company_logo?: string;
      candidate_required_location?: string;
      description?: string;
      job_type?: string;
      salary?: string;
      tags?: string[];
      publication_date?: string;
    }>;
  };

  return (data.jobs ?? []).map((j) => {
    const description = j.description ? stripHtml(j.description) : "";
    return {
      id: `remotive-${j.id}`,
      title: j.title ?? "Untitled role",
      company: j.company_name ?? "Unknown company",
      companyLogo: j.company_logo ?? null,
      location: j.candidate_required_location
        ? `Remote · ${j.candidate_required_location}`
        : "Remote",
      description,
      excerpt: description.slice(0, 380),
      employmentType: j.job_type,
      salary: j.salary || null,
      tags: [...(j.tags ?? []).slice(0, 5), "Remotive"],
      applyUrl: j.url ?? null,
      contactEmail: extractEmail(description),
      postedAt: j.publication_date ?? null,
      source: "remotive" as const,
    };
  });
}

async function fetchJooble(keywords: string, location: string): Promise<Job[]> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) return [];

  const res = await fetch(`https://jooble.org/api/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keywords,
      location: location || "United Kingdom",
      page: 1,
    }),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Jooble ${res.status}`);
  const data = (await res.json()) as {
    jobs?: Array<{
      id?: string | number;
      title?: string;
      location?: string;
      snippet?: string;
      salary?: string;
      link?: string;
      company?: string;
      updated?: string;
      type?: string;
    }>;
  };

  return (data.jobs ?? []).map((j, i) => {
    const description = j.snippet ? stripHtml(j.snippet) : "";
    return {
      id: `jooble-${j.id ?? i}`,
      title: j.title ?? "Untitled role",
      company: j.company ?? "Company",
      location: j.location || "United Kingdom",
      description,
      excerpt: description.slice(0, 380),
      employmentType: j.type,
      salary: j.salary || null,
      tags: ["Jooble", "UK"],
      applyUrl: j.link ?? null,
      contactEmail: extractEmail(description),
      postedAt: j.updated ?? null,
      source: "jooble" as const,
    };
  });
}

/** Optional SerpAPI Google Jobs (LinkedIn/Indeed/etc aggregations). */
async function fetchGoogleJobsViaSerp(
  query: string,
  location: string
): Promise<Job[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    engine: "google_jobs",
    q: query,
    location: location || "United Kingdom",
    hl: "en",
    api_key: key,
  });
  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
  const data = (await res.json()) as {
    jobs_results?: Array<{
      job_id?: string;
      title?: string;
      company_name?: string;
      location?: string;
      description?: string;
      share_link?: string;
      apply_options?: { link?: string }[];
      detected_extensions?: {
        posted_at?: string;
        salary?: string;
        schedule_type?: string;
      };
      thumbnail?: string;
    }>;
  };

  return (data.jobs_results ?? []).map((j, i) => {
    const description = j.description ? stripHtml(j.description) : "";
    return {
      id: `serpapi-${j.job_id ?? i}`,
      title: j.title ?? "Untitled role",
      company: j.company_name ?? "Company",
      companyLogo: j.thumbnail ?? null,
      location: j.location || "United Kingdom",
      description,
      excerpt: description.slice(0, 380),
      employmentType: j.detected_extensions?.schedule_type,
      salary: j.detected_extensions?.salary ?? null,
      tags: ["Google Jobs", "UK"],
      applyUrl:
        j.apply_options?.[0]?.link || j.share_link || null,
      contactEmail: extractEmail(description),
      postedAt: null,
      source: "serpapi" as const,
    };
  });
}

async function fetchArbeitnow(search: string): Promise<Job[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Arbeitnow ${res.status}`);
  const data = (await res.json()) as {
    data?: Array<{
      slug?: string;
      title?: string;
      company_name?: string;
      remote?: boolean;
      url?: string;
      tags?: string[];
      job_types?: string[];
      location?: string;
      description?: string;
      created_at?: number;
    }>;
  };

  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const cyberOnly = isCyberTopic(search);
  return (data.data ?? [])
    .filter((j) => {
      const hay = `${j.title} ${j.description} ${(j.tags ?? []).join(" ")} ${(j.location ?? "")}`.toLowerCase();
      const isCyber = /cyber|security|infosec|soc |penetration|pentest|grc/.test(hay);
      const matches = terms.every(
        (t) => t === "uk" || t === "united" || hay.includes(t)
      );
      if (cyberOnly) return isCyber || matches;
      return matches;
    })
    .slice(0, 40)
    .map((j) => {
      const description = j.description ? stripHtml(j.description) : "";
      const loc = j.location || (j.remote ? "Remote" : "Europe");
      return {
        id: `arbeitnow-${j.slug ?? j.title}`,
        title: j.title ?? "Untitled role",
        company: j.company_name ?? "Company",
        location: loc,
        description,
        excerpt: description.slice(0, 380),
        employmentType: j.job_types?.[0],
        salary: null,
        tags: [...(j.tags ?? []).slice(0, 4), "Arbeitnow"],
        applyUrl: j.url ?? null,
        contactEmail: extractEmail(description),
        postedAt: j.created_at
          ? new Date(j.created_at * 1000).toISOString()
          : null,
        source: "arbeitnow" as const,
      };
    });
}

export type FetchJobsOptions = {
  topic?: string;
  location?: LocationState;
};

export type JobsFetchResult = {
  jobs: Job[];
  sources: { name: string; count: number; ok: boolean }[];
  usedDemo: boolean;
  query?: string;
  error?: string;
};

export async function fetchJobs(
  options: FetchJobsOptions = {}
): Promise<JobsFetchResult> {
  const topic = (options.topic?.trim() || DEFAULT_TOPIC).trim();
  const cyberFeed = isCyberTopic(topic);
  const loc = options.location;
  const sources: JobsFetchResult["sources"] = [];
  const query = buildGoogleJobsQuery(topic, loc);
  const where =
    loc?.city ||
    (loc?.label && loc.label !== "United Kingdom" ? loc.label : "UK");
  let googleError: string | undefined;

  // 1) Google Custom Search (only works for legacy Google customers — closed to new accounts)
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
    try {
      const googleJobs = await fetchGoogleCustomSearchJobs({
        topic,
        location: loc,
        pages: 2,
      });
      sources.push({ name: "google", count: googleJobs.length, ok: true });
      if (googleJobs.length > 0) {
        return { jobs: googleJobs, sources, usedDemo: false, query };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google CSE failed";
      console.error("Google CSE failed:", error);
      sources.push({ name: "google", count: 0, ok: false });
      googleError = /does not have the access/i.test(message)
        ? "Google Custom Search JSON API is closed to new Google Cloud projects. Use Adzuna/Reed keys instead."
        : message;
    }
  } else {
    sources.push({ name: "google", count: 0, ok: false });
  }

  // 2) JobSpy (Indeed / LinkedIn / Glassdoor) + UK APIs
  const named = [
    ...(isJobSpyEnabled()
      ? [{ name: "jobspy" as const, promise: fetchJobSpyJobs({ topic, location: loc }) }]
      : []),
    { name: "adzuna", promise: fetchAdzuna(topic, where || "uk") },
    { name: "reed", promise: fetchReed(topic, where || "London") },
    ...(cyberFeed
      ? [
          { name: "remotive" as const, promise: fetchRemotive(`${topic} UK`) },
          { name: "arbeitnow" as const, promise: fetchArbeitnow(topic) },
        ]
      : []),
  ] as const;

  const results = await Promise.allSettled(named.map((n) => n.promise));
  let jobs: Job[] = [];

  results.forEach((r, i) => {
    const name = named[i].name;
    if (r.status === "fulfilled") {
      sources.push({ name, count: r.value.length, ok: true });
      jobs.push(...r.value);
    } else {
      sources.push({ name, count: 0, ok: false });
    }
  });

  const locationHint = loc?.city || loc?.label || "UK";

  let filtered = jobs
    .filter(isEnglishUkFriendly)
    .filter((j) => isUkRelevant(j, locationHint));

  if (cyberFeed) {
    filtered = filtered.filter(
      (j) =>
        isStrongCyberTitle(j.title) ||
        matchesTopic(j, topic) ||
        /cyber|security|soc|infosec|pentest|grc/i.test(j.tags.join(" "))
    );
    const strong = filtered.filter((j) => isStrongCyberTitle(j.title));
    if (strong.length >= 2) filtered = strong;
  }

  const seen = new Set<string>();
  filtered = filtered.filter((j) => {
    const key = `${j.title}|${j.company}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const hasBoard =
    (sources.find((s) => s.name === "jobspy")?.count ?? 0) > 0 ||
    (sources.find((s) => s.name === "adzuna")?.count ?? 0) > 0 ||
    (sources.find((s) => s.name === "reed")?.count ?? 0) > 0;

  if (hasBoard && filtered.length > 0) {
    return {
      jobs: filtered,
      sources,
      usedDemo: false,
      query,
      error: googleError,
    };
  }

  if (!cyberFeed) {
    return {
      jobs: filtered,
      sources,
      usedDemo: false,
      query,
      error: googleError,
    };
  }

  return {
    jobs: filtered,
    sources,
    usedDemo: false,
    query,
    error: googleError,
  };
}
