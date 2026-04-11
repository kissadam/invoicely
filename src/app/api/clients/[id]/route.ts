export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCompany } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { companyId, error } = await requireActiveCompany();
  if (error) return error;

  const existing = await prisma.client.findFirst({
    where: { id: params.id, companyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const client = await prisma.client.update({
    where: { id: params.id },
    data: {
      ...(body.name     !== undefined && { name:     body.name     }),
      ...(body.cui      !== undefined && { cui:      body.cui      }),
      ...(body.address  !== undefined && { address:  body.address  }),
      ...(body.vatPayer !== undefined && { vatPayer: body.vatPayer }),
      ...(body.currency !== undefined && { currency: body.currency }),
      ...(body.phone    !== undefined && { phone:    body.phone    }),
      ...(body.email    !== undefined && { email:    body.email    }),
    },
  });
  return NextResponse.json(client);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { companyId, error } = await requireActiveCompany();
  if (error) return error;

  const existing = await prisma.client.findFirst({
    where: { id: params.id, companyId },
    include: { _count: { select: { invoices: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing._count.invoices > 0) {
    return NextResponse.json(
      { error: `Clientul are ${existing._count.invoices} factură(i) asociată(e) și nu poate fi șters.` },
      { status: 409 }
    );
  }

  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}