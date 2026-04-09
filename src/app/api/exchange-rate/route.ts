export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchBnrRate } from "@/lib/bnr";

export async function GET(req: NextRequest) {
  const currency = new URL(req.url).searchParams.get("currency") ?? "EUR";
  try {
    const rate = await fetchBnrRate(currency.toUpperCase());
    return NextResponse.json(rate);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Eroare necunoscută";
    return NextResponse.json({ error: `Nu s-a putut prelua cursul BNR: ${message}` }, { status: 502 });
  }
}