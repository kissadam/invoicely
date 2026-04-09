export const dynamic = "force-dynamic";

/**
 * GET /api/company/:cui
 * Returns company data from DB cache or ANAF API.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAnafCompany, parseCUI } from "@/lib/anaf";

const CACHE_TTL_HOURS = 24;

export async function GET(
  _req: NextRequest,
  { params }: { params: { cui: string } }
) {
  const { cui } = params;

  if (!cui || cui.trim().length < 2) {
    return NextResponse.json({ error: "CUI lipsă sau invalid" }, { status: 400 });
  }

  const cuiNumber = parseCUI(cui);
  if (!cuiNumber) {
    return NextResponse.json({ error: "Format CUI invalid" }, { status: 400 });
  }

  const cuiStr = String(cuiNumber);

  // 1. Check DB cache
  const cached = await prisma.anafCache.findUnique({
    where: { cui: cuiStr },
  });

  if (cached) {
    const ageHours =
      (Date.now() - cached.fetchedAt.getTime()) / (1000 * 60 * 60);

    if (ageHours < CACHE_TTL_HOURS) {
      // Normalize CUI in case the cache entry was stored before the knownCui fix
      const data = cached.data as Record<string, unknown>;
      if (!data.cui || data.cui === "undefined") data.cui = cuiStr;
      return NextResponse.json({ source: "cache", data });
    }
  }

  // 2. Fetch from ANAF
  let company;
  try {
    company = await fetchAnafCompany(cuiStr);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută";
    // Return stale cache if available rather than error
    if (cached) {
      const data = cached.data as Record<string, unknown>;
      if (!data.cui || data.cui === "undefined") data.cui = cuiStr;
      return NextResponse.json({
        source: "stale_cache",
        data,
        warning: `ANAF indisponibil: ${message}`,
      });
    }
    return NextResponse.json(
      { error: `Eroare ANAF: ${message}` },
      { status: 502 }
    );
  }

  if (!company) {
    return NextResponse.json(
      { error: `Firma cu CUI ${cuiStr} nu a fost găsită în ANAF` },
      { status: 404 }
    );
  }

  // 3. Upsert into cache
  await prisma.anafCache.upsert({
    where: { cui: cuiStr },
    create: { cui: cuiStr, data: company as object },
    update: { data: company as object, fetchedAt: new Date() },
  });

  return NextResponse.json({ source: "anaf", data: company });
}