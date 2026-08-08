import { NextResponse } from "next/server";
import { fetchJobs } from "@/lib/jobs";
import type { LocationState } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "cyber security";
  const city = searchParams.get("city") ?? "";
  const label = searchParams.get("label") ?? "United Kingdom";

  const location: LocationState = {
    city,
    region: "",
    country: "United Kingdom",
    label,
    source: city ? "manual" : "default",
  };

  try {
    const result = await fetchJobs({ topic: q, location });
    return NextResponse.json({
      jobs: result.jobs,
      count: result.jobs.length,
      sources: result.sources,
      usedDemo: result.usedDemo,
      query: result.query,
      error: result.error,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch jobs", jobs: [], sources: [], usedDemo: true },
      { status: 500 }
    );
  }
}
