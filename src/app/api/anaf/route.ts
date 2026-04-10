export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cui = req.nextUrl.searchParams.get("cui")?.replace(/\D/g, "");
  if (!cui) return NextResponse.json({ error: "CUI lipsă" }, { status: 400 });

  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch("https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ cui: Number(cui), data: today }]),
    });

    if (!res.ok) throw new Error("ANAF unavailable");
    const json = await res.json();
    const found = json?.found?.[0];
    if (!found) return NextResponse.json({ error: "CUI negăsit în ANAF" }, { status: 404 });

    return NextResponse.json({
      name: found.date_generale?.denumire ?? null,
      address: found.date_generale?.adresa ?? null,
      vatPayer: !!found.inregistrare_scop_Tva?.dataInceputValabilitate,
    });
  } catch {
    return NextResponse.json({ error: "Eroare la interogarea ANAF" }, { status: 502 });
  }
}