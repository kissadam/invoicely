import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const { companyId } = await req.json();
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  // Verify the company belongs to this user
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    select: { id: true, name: true },
  });

  if (!company) {
    return NextResponse.json({ error: "Companie negăsită" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeCompanyId: companyId },
  });

  return NextResponse.json({ ok: true, company });
}