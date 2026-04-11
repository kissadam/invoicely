export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/export-data
 * Returns all user data as a JSON download (GDPR Art. 20 — data portability).
 */

import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET(req: Request) {
  const ip = (req.headers as Headers).get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed } = checkRateLimit(`export:${ip}`, 3, 60 * 60_000); // 3 exports per hour
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { userId, error } = await requireUserId();
  if (error) return error;

  const [user, companies, clients, invoices] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, createdAt: true,
        termsAcceptedAt: true, termsVersion: true,
      },
    }),
    prisma.company.findMany({ where: { userId } }),
    prisma.client.findMany({ where: { userId } }),
    prisma.invoice.findMany({
      where: { userId },
      include: { items: true },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user,
    companies,
    clients,
    invoices,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="invoicely-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}