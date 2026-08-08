"use client";

import { useState, type FormEvent } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LocationState } from "@/lib/types";
import { DEFAULT_TOPIC } from "@/lib/constants";
import { parseManualLocation } from "@/lib/location";
import { setStoredLocation } from "@/lib/storage";

type SearchLocationBarProps = {
  topic: string;
  location: LocationState | null;
  onTopicSearch: (query: string) => void;
  onLocationChange: (loc: LocationState) => void;
};

const TOPIC_CHIPS = [
  DEFAULT_TOPIC,
  "SOC analyst",
  "penetration tester",
  "cloud security",
  "information security",
];

const GENERAL_CHIPS = [
  "software engineer",
  "nurse",
  "teacher",
  "marketing",
  "accountant",
];

const CITY_CHIPS = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Remote UK",
];

export function SearchLocationBar({
  topic,
  location,
  onTopicSearch,
  onLocationChange,
}: SearchLocationBarProps) {
  const [topicValue, setTopicValue] = useState(topic);
  const [locValue, setLocValue] = useState(location?.label || "");

  function submitTopic(e: FormEvent) {
    e.preventDefault();
    onTopicSearch(topicValue.trim() || "cyber security");
  }

  function submitLocation(e: FormEvent) {
    e.preventDefault();
    const loc = parseManualLocation(locValue || "United Kingdom");
    setStoredLocation(loc);
    onLocationChange(loc);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submitTopic} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-300" />
          <Input
            value={topicValue}
            onChange={(e) => setTopicValue(e.target.value)}
            placeholder="Search any job — default is cyber security"
            className="pl-11"
            aria-label="Search topic"
          />
        </div>
        <Button type="submit" className="shrink-0">
          Search
        </Button>
      </form>

      <form onSubmit={submitLocation} className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-300" />
          <Input
            value={locValue}
            onChange={(e) => setLocValue(e.target.value)}
            placeholder="Location e.g. London, Manchester, Remote UK"
            className="pl-11"
            aria-label="Location"
          />
        </div>
        <Button type="submit" variant="secondary" className="shrink-0">
          Set
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {TOPIC_CHIPS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setTopicValue(s);
              onTopicSearch(s);
            }}
            className="rounded-full border border-pink-200 bg-white/80 px-3 py-1 text-xs text-pink-600 transition hover:border-pink-400 hover:text-pink-700"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {GENERAL_CHIPS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setTopicValue(s);
              onTopicSearch(s);
            }}
            className="rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {CITY_CHIPS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setLocValue(s);
              const loc = parseManualLocation(s);
              setStoredLocation(loc);
              onLocationChange(loc);
            }}
            className="rounded-full border border-fuchsia-200 bg-fuchsia-50/80 px-3 py-1 text-xs text-fuchsia-700 transition hover:border-fuchsia-400"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
