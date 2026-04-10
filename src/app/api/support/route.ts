export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { type, subject, description, name, email, phone } = await req.json();

  if (!subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Subiectul și descrierea sunt obligatorii" }, { status: 400 });
  }

  const typeLabel: Record<string, string> = {
    issue:    "Problemă tehnică",
    feedback: "Feedback",
    question: "Întrebare",
    other:    "Altele",
  };

  const html = `
    <h2 style="margin:0 0 16px">Support: ${typeLabel[type] ?? type}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600;width:120px">Tip</td><td style="padding:6px 12px">${typeLabel[type] ?? type}</td></tr>
      <tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Subiect</td><td style="padding:6px 12px">${subject}</td></tr>
      <tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Descriere</td><td style="padding:6px 12px;white-space:pre-wrap">${description}</td></tr>
      ${name  ? `<tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Nume</td><td style="padding:6px 12px">${name}</td></tr>` : ""}
      ${email ? `<tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Email</td><td style="padding:6px 12px">${email}</td></tr>` : ""}
      ${phone ? `<tr><td style="padding:6px 12px;background:#f8fafc;font-weight:600">Telefon</td><td style="padding:6px 12px">${phone}</td></tr>` : ""}
    </table>
  `;

  await resend.emails.send({
    from:    "Invoicely Support <noreply@akvisuals.ro>",
    to:      "hello@akvisuals.ro",
    replyTo: email || undefined,
    subject: `[Invoicely] ${typeLabel[type] ?? type}: ${subject}`,
    html,
  });

  return NextResponse.json({ ok: true });
}