export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { fetchBnrRate } from "@/lib/bnr";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed, retryAfterSec } = checkRateLimit(`bnr:${ip}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Prea multe cereri. Încearcă din nou mai târziu." }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const currency = new URL(req.url).searchParams.get("currency") ?? "EUR";
  try {
    const rate = await fetchBnrRate(currency.toUpperCase());
    return NextResponse.json(rate);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută";
    return NextResponse.json({ error: `Nu s-a putut prelua cursul BNR: ${message}` }, { status: 502 });
  }
}