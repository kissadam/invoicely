export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const existing = await prisma.company.findFirst({
    where: { id: params.id, userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.company.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const existing = await prisma.company.findFirst({
    where: { id: params.id, userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  try {
    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...(body.cui      && { cui:      body.cui                            }),
        ...(body.name     && { name:     body.name                           }),
        ...(body.address  !== undefined && { address:  body.address          }),
        ...(body.bank     !== undefined && { bank:     body.bank             }),
        ...(body.iban     !== undefined && { iban:     body.iban             }),
        ...(body.phone    !== undefined && { phone:    body.phone            }),
        ...(body.email    !== undefined && { email:    body.email            }),
        ...(body.vatPayer !== undefined && { vatPayer: Boolean(body.vatPayer) }),
        ...(body.vatRate  !== undefined && { vatRate:  body.vatRate != null ? Number(body.vatRate) : null }),
      },
    });
    return NextResponse.json(company);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isDupe = msg.includes("Unique constraint") || msg.includes("P2002");
    return NextResponse.json(
      { error: isDupe ? `CUI-ul "${body.cui}" există deja în baza de date` : "Eroare la salvare" },
      { status: 400 }
    );
  }
}