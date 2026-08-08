"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LocationState } from "@/lib/types";
import {
  DEFAULT_LOCATION,
  getBootLocation,
  parseManualLocation,
  requestBrowserLocation,
  reverseGeocode,
} from "@/lib/location";
import { markGeoAsked, setStoredLocation } from "@/lib/storage";
import { Input } from "@/components/ui/input";

type LocationGateProps = {
  onReady: (location: LocationState) => void;
};

export function LocationGate({ onReady }: LocationGateProps) {
  const [showPrompt, setShowPrompt] = useState(true);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const boot = getBootLocation();
    if (boot) {
      onReady(boot);
      setShowPrompt(false);
    }
  }, [onReady]);

  async function allowGeo() {
    setBusy(true);
    setError(null);
    markGeoAsked();
    try {
      const pos = await requestBrowserLocation();
      const loc = await reverseGeocode(
        pos.coords.latitude,
        pos.coords.longitude
      );
      setStoredLocation(loc);
      onReady(loc);
      setShowPrompt(false);
    } catch {
      setError("Location blocked — enter a city instead.");
    } finally {
      setBusy(false);
    }
  }

  function useManual() {
    markGeoAsked();
    const loc = parseManualLocation(manual || "United Kingdom");
    setStoredLocation(loc);
    onReady(loc);
    setShowPrompt(false);
  }

  function useUkDefault() {
    markGeoAsked();
    setStoredLocation(DEFAULT_LOCATION);
    onReady(DEFAULT_LOCATION);
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  return (
    <div className="mb-6 rounded-3xl border border-pink-200 bg-white/90 p-5 shadow-lg shadow-pink-100">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
          <MapPin className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-semibold text-pink-950">Where are you based?</h2>
          <p className="mt-1 text-sm text-pink-500">
            We&apos;ll prioritise Cyber Security roles near you (UK) — or Remote
            UK.
          </p>
          {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={allowGeo} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Use my location
            </Button>
            <Button variant="secondary" onClick={useUkDefault}>
              Whole UK
            </Button>
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Or type city: London, Manchester…"
            />
            <Button variant="outline" onClick={useManual}>
              Go
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
