import type { Job, LocationState } from "@/lib/types";

type GoogleCseItem = {
  title?: string;
  link?: string;
  displayLink?: string;
  snippet?: string;
  htmlSnippet?: string;
  pagemap?: {
    metatags?: Array<Record<string, string>>;
    cse_image?: Array<{ src?: string }>;
    jobposting?: Array<{
      title?: string;
      description?: string;
      dataposted?: string;
      hiringorganization?: string;
      joblocation?: string;
      basesalary?: string;
    }>;
  };
};

type GoogleCseResponse = {
  items?: GoogleCseItem[];
  error?: { message?: string; code?: number };
  searchInformation?: { totalResults?: string };
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function companyFromItem(item: GoogleCseItem): string {
  const org = item.pagemap?.jobposting?.[0]?.hiringorganization;
  if (org) return org;
  const meta = item.pagemap?.metatags?.[0];
  const ogSite = meta?.["og:site_name"];
  if (ogSite) return ogSite;
  const host = (item.displayLink || "")
    .replace(/^www\./i, "")
    .split(".")[0];
  if (!host) return item.displayLink || "Job board";
  return host.charAt(0).toUpperCase() + host.slice(1);
}

function locationFromItem(item: GoogleCseItem, fallback: string): string {
  const jobLoc = item.pagemap?.jobposting?.[0]?.joblocation;
  if (jobLoc) return jobLoc;
  const meta = item.pagemap?.metatags?.[0];
  const geo = meta?.["og:locale"] || meta?.["geo.placename"];
  if (geo && /uk|gb|london|manchester|birmingham/i.test(geo)) return geo;
  const hay = `${item.title} ${item.snippet}`.toLowerCase();
  for (const city of [
    "London",
    "Manchester",
    "Birmingham",
    "Leeds",
    "Bristol",
    "Glasgow",
    "Edinburgh",
    "Remote UK",
    "United Kingdom",
  ]) {
    if (hay.includes(city.toLowerCase())) return city;
  }
  return fallback || "United Kingdom";
}

function salaryFromItem(item: GoogleCseItem): string | null {
  const base = item.pagemap?.jobposting?.[0]?.basesalary;
  if (base) return base;
  const text = `${item.title} ${item.snippet}`;
  const match = text.match(/£[\d,]+(?:\s*[-–]\s*£?[\d,]+)?(?:\s*(?:pa|per annum|a year))?/i);
  return match?.[0] ?? null;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[|\-–—]\s*(Indeed|Reed|LinkedIn|Totaljobs|CWJobs|Glassdoor|Google).*$/i, "")
    .replace(/\s+job(s)?\s*$/i, "")
    .trim();
}

function toJobId(link: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    hash = (hash * 31 + link.charCodeAt(i)) >>> 0;
  }
  return `google-${hash}-${index}`;
}

/**
 * Build query like: "cyber security jobs London" or "cyber security jobs UK"
 */
export function buildGoogleJobsQuery(
  topic: string,
  location?: LocationState | null
): string {
  const base = (topic || "cyber security").trim().replace(/\s+jobs?\s*$/i, "");
  const city = location?.city?.trim();
  const label = location?.label?.trim();

  if (city && city.toLowerCase() !== "united kingdom" && city.toLowerCase() !== "uk") {
    return `${base} jobs ${city}`;
  }
  if (
    label &&
    !/^united kingdom$/i.test(label) &&
    !/^uk$/i.test(label) &&
    label.length < 40
  ) {
    return `${base} jobs ${label}`;
  }
  return `${base} jobs UK`;
}

async function fetchGooglePage(
  query: string,
  start: number
): Promise<GoogleCseItem[]> {
  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!key || !cx) {
    throw new Error("Missing GOOGLE_API_KEY or GOOGLE_SEARCH_ENGINE_ID");
  }

  const params = new URLSearchParams({
    key,
    cx,
    q: query,
    num: "10",
    start: String(start),
    gl: "uk",
    hl: "en",
    safe: "active",
  });

  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
    { next: { revalidate: 300 } }
  );

  const data = (await res.json()) as GoogleCseResponse;
  if (!res.ok) {
    throw new Error(
      data.error?.message || `Google CSE HTTP ${res.status}`
    );
  }
  return data.items ?? [];
}

export async function fetchGoogleCustomSearchJobs(options: {
  topic?: string;
  location?: LocationState | null;
  pages?: number;
}): Promise<Job[]> {
  const query = buildGoogleJobsQuery(
    options.topic || "cyber security",
    options.location
  );
  const pages = Math.min(options.pages ?? 2, 3);
  const locationLabel =
    options.location?.city ||
    options.location?.label ||
    "United Kingdom";

  const batches = await Promise.allSettled(
    Array.from({ length: pages }, (_, i) =>
      fetchGooglePage(query, 1 + i * 10)
    )
  );

  const items: GoogleCseItem[] = [];
  const errors: string[] = [];

  for (const batch of batches) {
    if (batch.status === "fulfilled") {
      items.push(...batch.value);
    } else {
      errors.push(
        batch.reason instanceof Error
          ? batch.reason.message
          : String(batch.reason)
      );
    }
  }

  if (items.length === 0 && errors.length > 0) {
    throw new Error(errors[0]);
  }

  const jobs: Job[] = [];
  const seen = new Set<string>();

  items.forEach((item, index) => {
    const link = item.link?.trim();
    if (!link || seen.has(link)) return;
    seen.add(link);

    const snippet = stripHtml(item.snippet || item.htmlSnippet || "");
    const postingDesc = item.pagemap?.jobposting?.[0]?.description;
    const description = postingDesc
      ? stripHtml(postingDesc)
      : snippet;
    const title = cleanTitle(
      item.pagemap?.jobposting?.[0]?.title || item.title || "Untitled role"
    );
    const company = companyFromItem(item);
    const posted =
      item.pagemap?.jobposting?.[0]?.dataposted ||
      item.pagemap?.metatags?.[0]?.["article:published_time"] ||
      null;

    jobs.push({
      id: toJobId(link, index),
      title,
      company,
      companyLogo: item.pagemap?.cse_image?.[0]?.src ?? null,
      location: locationFromItem(item, locationLabel),
      description: description || snippet || "Open the listing for the full job description.",
      excerpt: snippet.slice(0, 420),
      salary: salaryFromItem(item),
      tags: ["Google", "UK", company].filter(Boolean) as string[],
      applyUrl: link,
      contactEmail: null,
      postedAt: posted,
      source: "google",
    });
  });

  return jobs;
}
