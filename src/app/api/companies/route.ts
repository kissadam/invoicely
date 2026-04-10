export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const companies = await prisma.company.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json();
  if (!body.cui || !body.name) {
    return NextResponse.json({ error: "cui și name sunt obligatorii" }, { status: 400 });
  }

  const data = {
    userId,
    cui:      body.cui,
    name:     body.name,
    address:  body.address  ?? null,
    bank:     body.bank     ?? null,
    iban:     body.iban     ?? null,
    phone:    body.phone    ?? null,
    email:    body.email    ?? null,
    vatPayer: body.vatPayer ?? false,
    vatRate:  body.vatRate != null ? Number(body.vatRate) : null,
  };

  try {
    // Use upsert so re-creating a deleted company (same CUI) works
    const company = await prisma.company.upsert({
      where: { cui: body.cui },
      create: data,
      update: { ...data, userId }, // keep userId guard in update too
    });
    return NextResponse.json(company, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("POST /api/companies error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}