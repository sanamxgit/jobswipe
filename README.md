# JobSwipe — UK Cyber Security (pink light theme)

Swipe UK cyber security roles, save favourites Instagram-style, generate tailored cover letters, and apply.

## What's new

- Default feed: **Cyber Security** · **UK**
- Location permission + manual city (London, Manchester, Remote UK…)
- Multi-source jobs: **JobSpy** (Indeed, LinkedIn, Glassdoor), Adzuna, Reed
- Swipe **right = Save**, left = Pass, up = Super Save
- **Saved** page: full JD, Generate Cover Letter, Apply Now
- Profile: email + PDF CV (localStorage)
- Soft pink / light UI

## Run locally

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000

Works without API keys (JobSpy needs Python — see below). Add Adzuna keys + AI keys for best coverage.

### JobSpy (Indeed / LinkedIn / Glassdoor)

JobSwipe uses [JobSpy](https://github.com/speedyapply/JobSpy) for live UK listings from major boards.

```bash
pip install -r requirements.txt
```

Requires **Python 3.10+**. Set `JOBSPY_ENABLED=false` in `.env.local` to disable. JobSpy runs locally via `scripts/jobspy_scrape.py` (not supported on Vercel serverless — use Adzuna there or a Python worker).

### Recommended free keys

| Service | Purpose |
|---------|---------|
| JobSpy + Python | Indeed, LinkedIn, Glassdoor (local dev) |
| Adzuna | Best free UK job API |
| Reed | UK listings |
| OpenAI or xAI | Cover letters |
| Resend | Optional real email send |
| SerpAPI | Google Jobs aggregation |

## Swipe

| Action | Meaning |
|--------|---------|
| ← / ✕ | Pass |
| → / bookmark | Save |
| ↑ / sparkles | Super save |

## Apply flow

1. Profile → email + upload CV (PDF)
2. Saved → Generate Best Cover Letter
3. Apply Now → review letter → mailto / Resend / open listing

## Deploy (Vercel)

Push to GitHub → import on Vercel → add env vars → deploy.
