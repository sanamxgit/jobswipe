export type JobSource =
  | "google"
  | "adzuna"
  | "reed"
  | "indeed"
  | "linkedin"
  | "glassdoor"
  | "zip_recruiter"
  | "remotive"
  | "jooble"
  | "serpapi"
  | "arbeitnow"
  | "demo";

export type Job = {
  id: string;
  title: string;
  company: string;
  companyLogo?: string | null;
  location: string;
  description: string;
  excerpt?: string;
  employmentType?: string;
  salary?: string | null;
  tags: string[];
  applyUrl?: string | null;
  contactEmail?: string | null;
  postedAt?: string | null;
  source: JobSource;
  interest?: "saved" | "super";
};

export type SavedJob = {
  id: string;
  job: Job;
  interest: "saved" | "super";
  savedAt: string;
  coverLetter?: string;
};

export type UserProfileLocal = {
  email: string;
  fullName: string;
  locationLabel: string;
  cvFileName?: string;
  /** base64 data URL of PDF */
  cvDataUrl?: string;
};

export type SwipeDirection = "left" | "right" | "up";

export type LocationState = {
  city: string;
  region: string;
  country: string;
  label: string;
  lat?: number;
  lon?: number;
  source: "geo" | "manual" | "default";
};
