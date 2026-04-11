export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/support
 * Forwards feedback/support submissions to hello@akvisuals.ro via Resend.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed, retryAfterSec } = checkRateLimit(`support:${ip}`, 5, 10 * 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Prea multe cereri. Încearcă din nou." }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY not set");
    return NextResponse.json({ error: "Support not configured" }, { status: 503 });
  }

  const body = await req.json();
  const { type, subject, description, name, email, phone } = body;

  if (!subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Subiectul și descrierea sunt obligatorii" }, { status: 400 });
  }

  const typeLabel: Record<string, string> = {
    issue:    "Problemă tehnică",
    feedback: "Feedback",
    question: "Întrebare",
    other:    "Altele",
  };

  const resend = new Resend(key);

  const text = [
    `Tip: ${typeLabel[type] ?? type}`,
    `Subiect: ${subject}`,
    ``,
    description,
    ``,
    name  ? `Nume: ${name}`     : "",
    email ? `Email: ${email}`   : "",
    phone ? `Telefon: ${phone}` : "",
  ].filter(Boolean).join("\n");

  const { error } = await resend.emails.send({
    from:     "Invoicely Support <onboarding@resend.dev>",
    to:       "hello@akvisuals.ro",
    replyTo:  email || undefined,
    subject:  `[Invoicely] ${typeLabel[type] ?? type}: ${subject}`,
    text,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: error.message ?? "Eroare la trimitere" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}