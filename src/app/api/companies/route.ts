export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getPlanLimits } from "@/lib/plans";

export async function GET() {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const [companies, user] = await Promise.all([
    prisma.company.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, cui: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeCompanyId: true },
    }),
  ]);

  return NextResponse.json({ companies, activeCompanyId: user?.activeCompanyId ?? null });
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json();
  if (!body.cui || !body.name) {
    return NextResponse.json({ error: "cui și name sunt obligatorii" }, { status: 400 });
  }
  if (body.vatRate != null && (Number(body.vatRate) < 0 || Number(body.vatRate) > 100)) {
    return NextResponse.json({ error: "vatRate invalid" }, { status: 400 });
  }

  // ── Company limit check ─────────────────────────────────────────────────
  const userWithSub = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscription: { select: { plan: true } } },
  });
  const plan = userWithSub?.subscription?.plan ?? "free";
  const limits = getPlanLimits(plan);

  if (limits.companies !== Infinity) {
    const companyCount = await prisma.company.count({ where: { userId } });
    if (companyCount >= limits.companies) {
      return NextResponse.json(
        { error: `Planul Free permite o singură companie. Fă upgrade la Pro pentru companii multiple.` },
        { status: 403 }
      );
    }
  }

  // ── Duplicate CUI check ──────────────────────────────────────────────────
  const duplicate = await prisma.company.findFirst({ where: { userId, cui: body.cui } });
  if (duplicate) {
    return NextResponse.json(
      { error: `Există deja o companie cu CUI-ul ${body.cui}.` },
      { status: 400 }
    );
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
    const company = await prisma.company.create({ data });

    // Switch active company to the newly created one
    await prisma.user.update({
      where: { id: userId },
      data:  { activeCompanyId: company.id },
    });

    // Create a free subscription if one doesn't exist
    await prisma.subscription.upsert({
      where:  { userId },
      update: {},
      create: { userId, plan: "free", status: "active" },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("POST /api/companies error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}