export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/support
 * Forwards feedback/support submissions to hello@akvisuals.ro via Web3Forms.
 * Get a free access key at https://web3forms.com — enter hello@akvisuals.ro,
 * copy the key, and set WEB3FORMS_KEY in your .env / Vercel env vars.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed, retryAfterSec } = checkRateLimit(`support:${ip}`, 5, 10 * 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Prea multe cereri. Încearcă din nou." }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const key = process.env.WEB3FORMS_KEY;
  if (!key) {
    console.error("WEB3FORMS_KEY not set");
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

  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: key,
      subject:    `[Invoicely] ${typeLabel[type] ?? type}: ${subject}`,
      from_name:  name || "Invoicely User",
      ...(email ? { email } : {}),
      message: [
        `Tip: ${typeLabel[type] ?? type}`,
        `Subiect: ${subject}`,
        ``,
        description,
        ``,
        name  ? `Nume: ${name}`     : "",
        email ? `Email: ${email}`   : "",
        phone ? `Telefon: ${phone}` : "",
      ].filter(Boolean).join("\n"),
    }),
  });

  const data = await res.json();
  if (!data.success) {
    console.error("Web3Forms error:", data);
    return NextResponse.json({ error: "Eroare la trimitere" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}