export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DELETE /api/delete-account
 * GDPR Art. 17 — Right to erasure.
 *
 * Strategy: anonymise personal data on User + Clients, soft-delete the user.
 * Invoices are RETAINED (anonymised) for 10-year fiscal retention requirement
 * under Romanian law (Legea contabilității 82/1991, art. 25).
 */

import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request) {
  const ip = (req.headers as Headers).get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed } = checkRateLimit(`delete-account:${ip}`, 3, 60 * 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { userId, error } = await requireUserId();
  if (error) return error;

  const anonEmail = `deleted-${userId}@anonymised.invalid`;
  const now = new Date();

  // Anonymise user — preserve record for audit trail
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: anonEmail,
      name: "Deleted User",
      image: null,
      deletedAt: now,
    },
  });

  // Anonymise clients (keep records for invoice integrity)
  await prisma.client.updateMany({
    where: { userId },
    data: { phone: null, email: null, anafData: undefined },
  });

  // Revoke all sessions (sign out everywhere)
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true });
}