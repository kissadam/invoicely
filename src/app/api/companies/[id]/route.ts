export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

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
  const company = await prisma.company.update({
    where: { id: params.id },
    data: {
      ...(body.cui     && { cui:     body.cui     }),
      ...(body.name    && { name:    body.name    }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.bank    !== undefined && { bank:    body.bank    }),
      ...(body.iban    !== undefined && { iban:    body.iban    }),
      ...(body.phone   !== undefined && { phone:   body.phone   }),
      ...(body.email   !== undefined && { email:   body.email   }),
    },
  });
  return NextResponse.json(company);
}