export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

const TERMS_VERSION = "1.0";

export async function POST(req: Request) {
  const ip = (req.headers as Headers).get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed } = checkRateLimit(`accept-terms:${ip}`, 10, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { userId, error } = await requireUserId();
  if (error) return error;

  await prisma.user.update({
    where: { id: userId },
    data: {
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
    },
  });

  return NextResponse.json({ ok: true });
}