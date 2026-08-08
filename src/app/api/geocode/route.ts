import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "JobSwipe/1.0 (personal job board)",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocode failed" },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        county?: string;
        state?: string;
        country?: string;
      };
    };
    const a = data.address ?? {};
    const city =
      a.city || a.town || a.village || a.municipality || a.county || "";
    const region = a.state || a.county || "";
    const country = a.country || "United Kingdom";
    const label = [city, region || country].filter(Boolean).join(", ");

    return NextResponse.json({
      city,
      region,
      country,
      label: label || "United Kingdom",
      lat: Number(lat),
      lon: Number(lon),
      source: "geo",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Geocode error" }, { status: 500 });
  }
}
