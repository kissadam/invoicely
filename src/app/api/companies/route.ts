export const dynamic = "force-dynamic";

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

  const company = await prisma.company.create({
    data: {
      userId,
      cui:     body.cui,
      name:    body.name,
      address: body.address ?? null,
      bank:    body.bank    ?? null,
      iban:    body.iban    ?? null,
      phone:   body.phone   ?? null,
      email:   body.email   ?? null,
    },
  });
  return NextResponse.json(company, { status: 201 });
}