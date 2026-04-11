import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plans";

export async function GET() {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [user, companiesCount, invoicesThisMonth] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeCompanyId: true,
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      },
    }),
    prisma.company.count({ where: { userId } }),
    prisma.invoice.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  const plan = user?.subscription?.plan ?? "free";
  const limits = getPlanLimits(plan);

  return NextResponse.json({
    plan,
    status: user?.subscription?.status ?? "active",
    currentPeriodEnd: user?.subscription?.currentPeriodEnd ?? null,
    usage: {
      companies:        { current: companiesCount,      limit: limits.companies === Infinity ? null : limits.companies },
      invoicesPerMonth: { current: invoicesThisMonth,   limit: limits.invoicesPerMonth === Infinity ? null : limits.invoicesPerMonth },
    },
    limits: {
      companies:        limits.companies,
      invoicesPerMonth: limits.invoicesPerMonth,
      priceEur:         limits.priceEur,
    },
  });
}