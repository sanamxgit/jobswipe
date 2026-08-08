import type { LocationState } from "@/lib/types";
import {
  getStoredLocation,
  hasAskedGeo,
  markGeoAsked,
  setStoredLocation,
} from "@/lib/storage";

export const DEFAULT_LOCATION: LocationState = {
  city: "",
  region: "England",
  country: "United Kingdom",
  label: "United Kingdom",
  source: "default",
};

export function requestBrowserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 1000 * 60 * 30,
    });
  });
}

/** Reverse geocode via our API (Nominatim server-side). */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<LocationState> {
  const res = await fetch(
    `/api/geocode?lat=${lat}&lon=${lon}`
  );
  if (!res.ok) throw new Error("Could not resolve location");
  const data = (await res.json()) as LocationState;
  return { ...data, source: "geo" };
}

export function parseManualLocation(input: string): LocationState {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_LOCATION;
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  return {
    city: parts[0] || "",
    region: parts[1] || "",
    country: parts[2] || "United Kingdom",
    label: trimmed,
    source: "manual",
  };
}

/**
 * Returns stored location if present.
 * Returns null when we should show the first-visit location prompt.
 */
export function getBootLocation(): LocationState | null {
  const stored = getStoredLocation();
  if (stored) return stored;
  if (hasAskedGeo()) return DEFAULT_LOCATION;
  return null;
}

export async function tryAutoGeolocate(): Promise<LocationState | null> {
  markGeoAsked();
  try {
    const pos = await requestBrowserLocation();
    const loc = await reverseGeocode(
      pos.coords.latitude,
      pos.coords.longitude
    );
    setStoredLocation(loc);
    return loc;
  } catch {
    return null;
  }
}
