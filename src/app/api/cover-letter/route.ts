import { NextResponse } from "next/server";
import type { Job } from "@/lib/types";

type Body = {
  job: Job;
  applicantName?: string;
  applicantEmail?: string;
  cvFileName?: string;
  extraNotes?: string;
};

const SYSTEM_PROMPT = `You are an elite UK careers writer specialising in Cyber Security, Information Security, GRC, SOC, AppSec, Cloud Security, and technical security roles.

Write a highly tailored, professional cover letter for the UK job market based on the job listing provided (title, company, location, and snippet/description from Google job search results).

Rules:
- Length: 280–380 words. Plain text only (no markdown, no bullet points, no headings).
- Tone: confident, warm, precise — never generic, never fluffy, never cliché openers.
- NEVER start with "I am writing to apply" or "I am excited to apply".
- Open with a specific hook that references the company name and a concrete theme from the listing (e.g. SOC operations, ISO 27001, cloud hardening, incident response, UK regulated environment).
- Mirror useful keywords from the listing only when credible for a cyber professional (tools, frameworks, clearance, NCSC, GDPR, FCA, MITRE ATT&CK, SIEM, EDR, pentest, GRC).
- Emphasise outcomes: risk reduction, detection quality, secure delivery, stakeholder trust, compliance readiness.
- If the listing snippet is short, still write a full letter — infer reasonable cyber-security motivations without inventing fake employers, degrees, clearance, or certifications the applicant did not provide.
- Include a short closing with interview availability and thanks.
- Sign off with the applicant's name if provided; otherwise end with "Kind regards,".
- Address "Hiring Manager" unless a named contact is given.
- UK English spelling (organise, favour, specialised) when natural.`;

function buildFallbackLetter(
  job: Job,
  name?: string,
  email?: string
): string {
  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. The opportunity to contribute to your security posture — particularly across ${job.location} — aligns closely with the direction I want to take in my cyber security career.

Having reviewed the role, I am especially motivated by the focus on practical risk reduction and modern defensive practice. I bring a methodical approach to investigating issues, documenting findings clearly, and collaborating with technical and non-technical stakeholders so that recommendations are actually adopted.

I am keen to bring that mindset to ${job.company}, and I would welcome the chance to discuss how I can support your team. I am available for interview at your convenience${email ? ` and can be reached at ${email}` : ""}.

Thank you for your time and consideration.

Kind regards,
${name || "Applicant"}`;
}

async function generateWithOpenAI(
  job: Job,
  applicantName?: string,
  applicantEmail?: string,
  cvFileName?: string,
  extraNotes?: string
) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.55,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Write the cover letter.

Applicant name: ${applicantName || "Not provided"}
Applicant email: ${applicantEmail || "Not provided"}
CV on file: ${cvFileName || "Not uploaded"}
Extra notes from applicant: ${extraNotes || "None"}

JOB TITLE: ${job.title}
COMPANY: ${job.company}
LOCATION: ${job.location}
SALARY: ${job.salary || "Not listed"}
TAGS: ${job.tags.join(", ")}
FULL JOB DESCRIPTION:
${job.description.slice(0, 4500)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${text}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

async function generateWithGrok(
  job: Job,
  applicantName?: string,
  applicantEmail?: string,
  cvFileName?: string,
  extraNotes?: string
) {
  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!key) return null;

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.XAI_MODEL || "grok-2-latest",
      temperature: 0.55,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Write the cover letter.

Applicant name: ${applicantName || "Not provided"}
Applicant email: ${applicantEmail || "Not provided"}
CV on file: ${cvFileName || "Not uploaded"}
Extra notes from applicant: ${extraNotes || "None"}

JOB TITLE: ${job.title}
COMPANY: ${job.company}
LOCATION: ${job.location}
SALARY: ${job.salary || "Not listed"}
TAGS: ${job.tags.join(", ")}
FULL JOB DESCRIPTION:
${job.description.slice(0, 4500)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Grok error: ${text}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (!body?.job?.title) {
      return NextResponse.json({ error: "Job is required" }, { status: 400 });
    }

    const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();
    let letter: string | null = null;

    const args = [
      body.job,
      body.applicantName,
      body.applicantEmail,
      body.cvFileName,
      body.extraNotes,
    ] as const;

    if (provider === "openai") {
      letter = await generateWithOpenAI(...args);
    } else if (provider === "grok" || provider === "xai") {
      letter = await generateWithGrok(...args);
    } else {
      letter =
        (await generateWithGrok(...args)) ||
        (await generateWithOpenAI(...args));
    }

    if (!letter) {
      letter = buildFallbackLetter(
        body.job,
        body.applicantName,
        body.applicantEmail
      );
    }

    return NextResponse.json({ coverLetter: letter });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate letter",
      },
      { status: 500 }
    );
  }
}
