"use client";

import { useCallback, useState } from "react";
import { SearchLocationBar } from "@/components/search-location-bar";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import { LocationGate } from "@/components/location-gate";
import type { LocationState } from "@/lib/types";
import { DEFAULT_TOPIC } from "@/lib/constants";
import { DEFAULT_LOCATION } from "@/lib/location";
import { markGeoAsked, setStoredLocation } from "@/lib/storage";

export default function HomePage() {
  const [query, setQuery] = useState(DEFAULT_TOPIC);
  const [location, setLocation] = useState<LocationState | null>(null);

  const onLocationReady = useCallback((loc: LocationState) => {
    setLocation(loc);
  }, []);

  function startWithUk() {
    markGeoAsked();
    setStoredLocation(DEFAULT_LOCATION);
    setLocation(DEFAULT_LOCATION);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <section className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">
          I know you can do it Sunnu ♡. Your Sammy Loves you alottttt.
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-pink-950 sm:text-3xl">
          Swipe into cyber security roles
        </h1>
        <p className="max-w-xl text-sm text-pink-500 sm:text-base">
          Default feed: Cyber Security across the UK. Search any role above —
          swipe right to save, left to pass, up for a super save — then apply
          from Saved with an AI cover letter.
        </p>
        {location && (
          <p className="text-xs text-pink-400">
            Showing near{" "}
            <span className="font-medium text-pink-600">{location.label}</span>
          </p>
        )}
      </section>

      {!location && <LocationGate onReady={onLocationReady} />}

      {location && (
        <>
          <section className="mb-6">
            <SearchLocationBar
              topic={query}
              location={location}
              onTopicSearch={setQuery}
              onLocationChange={setLocation}
            />
          </section>
          <SwipeDeck query={query} location={location} />
        </>
      )}

      {!location && (
        <p className="mt-4 text-center text-xs text-pink-400">
          Tip: tap{" "}
          <button
            type="button"
            className="font-semibold text-pink-600 underline"
            onClick={startWithUk}
          >
            Whole UK
          </button>{" "}
          to start swiping right away.
        </p>
      )}
    </main>
  );
}
