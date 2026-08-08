import { NextResponse } from "next/server";
import type { Job } from "@/lib/types";

type Body = {
  job: Job;
  coverLetter: string;
  fromEmail: string;
  fromName?: string;
  toEmail?: string | null;
  cvFileName?: string;
  cvDataUrl?: string;
};

/**
 * Apply helper:
 * - If RESEND_API_KEY + recruiter email → send email (CV as attachment when provided)
 * - Otherwise return a mailto / copy package for the client
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (!body?.job || !body.coverLetter || !body.fromEmail) {
      return NextResponse.json(
        { error: "job, coverLetter, and fromEmail are required" },
        { status: 400 }
      );
    }

    const to =
      body.toEmail ||
      body.job.contactEmail ||
      null;
    const subject = `Application: ${body.job.title} — ${body.fromName || body.fromEmail}`;
    const textBody = `${body.coverLetter}

---
Applicant: ${body.fromName || ""} <${body.fromEmail}>
Role: ${body.job.title} at ${body.job.company}
CV attached: ${body.cvFileName ? "Yes — " + body.cvFileName : "No (please request if needed)"}
Listing: ${body.job.applyUrl || "N/A"}
`;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && to) {
      const from =
        process.env.RESEND_FROM_EMAIL || "JobSwipe <onboarding@resend.dev>";

      const attachments = [];
      if (body.cvDataUrl && body.cvFileName) {
        const base64 = body.cvDataUrl.includes(",")
          ? body.cvDataUrl.split(",")[1]
          : body.cvDataUrl;
        attachments.push({
          filename: body.cvFileName,
          content: base64,
        });
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: body.fromEmail,
          subject,
          text: textBody,
          attachments: attachments.length ? attachments : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          {
            error: `Email send failed: ${err}`,
            mailto: buildMailto(to, subject, textBody),
            subject,
            body: textBody,
            to,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        sent: true,
        to,
        subject,
        message: "Application email sent",
      });
    }

    return NextResponse.json({
      sent: false,
      to,
      subject,
      body: textBody,
      mailto: to ? buildMailto(to, subject, textBody) : null,
      applyUrl: body.job.applyUrl ?? null,
      message: to
        ? "Open your email client or copy the letter to apply"
        : "No recruiter email found — copy letter or open the listing",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Apply failed" },
      { status: 500 }
    );
  }
}

function buildMailto(to: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body.slice(0, 1800))}`;
}
