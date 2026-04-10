export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { fetchAnafCompany } from "@/lib/anaf";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed, retryAfterSec } = checkRateLimit(`anaf:${ip}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Prea multe cereri. Încearcă din nou mai târziu." }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const cui = req.nextUrl.searchParams.get("cui") ?? "";
  if (!cui.trim()) return NextResponse.json({ error: "CUI lipsă" }, { status: 400 });

  try {
    const company = await fetchAnafCompany(cui);
    if (!company) {
      return NextResponse.json({ error: "CUI negăsit în ANAF" }, { status: 404 });
    }
    return NextResponse.json({
      name:     company.name,
      address:  company.address,
      vatPayer: company.vatPayer,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la interogarea ANAF";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}