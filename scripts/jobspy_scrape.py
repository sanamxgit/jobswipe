#!/usr/bin/env python3
"""JobSpy scrape helper — JSON in (stdin), JSON out (stdout). Used by JobSwipe Next.js API."""
from __future__ import annotations

import json
import math
import sys
from datetime import date, datetime


def _json_default(value):
    if value is None:
        return None
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if hasattr(value, "item"):
        try:
            return value.item()
        except (ValueError, AttributeError):
            pass
    return str(value)


def _clean_record(record: dict) -> dict:
    cleaned = {}
    for key, value in record.items():
        if value is None:
            cleaned[key] = None
            continue
        if isinstance(value, float) and math.isnan(value):
            cleaned[key] = None
        elif isinstance(value, (list, tuple)):
            cleaned[key] = [
                None
                if isinstance(v, float) and math.isnan(v)
                else v.isoformat()
                if isinstance(v, (datetime, date))
                else v
                for v in value
            ]
        elif isinstance(value, (datetime, date)):
            cleaned[key] = value.isoformat()
        else:
            cleaned[key] = value
    return cleaned


def main() -> int:
    try:
        raw = sys.stdin.read()
        opts = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid JSON input: {exc}", "jobs": []}))
        return 1

    search_term = opts.get("search_term") or "cyber security"
    location = opts.get("location") or "United Kingdom"
    results_wanted = int(opts.get("results_wanted") or 15)
    hours_old = opts.get("hours_old")
    if hours_old is not None:
        hours_old = int(hours_old)
    country_indeed = opts.get("country_indeed") or "UK"
    sites = opts.get("sites") or ["indeed", "linkedin", "glassdoor"]
    linkedin_fetch_description = bool(opts.get("linkedin_fetch_description", True))

    try:
        from jobspy import scrape_jobs
    except ImportError:
        print(
            json.dumps(
                {
                    "error": "python-jobspy not installed. Run: pip install -r requirements.txt",
                    "jobs": [],
                }
            )
        )
        return 1

    try:
        df = scrape_jobs(
            site_name=sites,
            search_term=search_term,
            location=location,
            results_wanted=results_wanted,
            hours_old=hours_old,
            country_indeed=country_indeed,
            linkedin_fetch_description=linkedin_fetch_description,
            verbose=0,
        )
    except Exception as exc:  # noqa: BLE001 — surface scraper errors to Node
        print(json.dumps({"error": str(exc), "jobs": []}))
        return 1

    jobs = []
    if df is not None and not df.empty:
        records = df.to_dict(orient="records")
        jobs = [_clean_record(r) for r in records]

    print(json.dumps({"jobs": jobs, "count": len(jobs)}, default=_json_default))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
