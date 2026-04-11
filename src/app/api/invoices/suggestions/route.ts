export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/invoices/suggestions?clientId=xxx
 * Returns ranked item suggestions based on prior invoices for this client.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveCompany } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { companyId, error } = await requireActiveCompany();
  if (error) return error;

  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ suggestions: [] });

  const items = await prisma.invoiceItem.findMany({
    where: {
      invoice: { companyId, clientId, status: { not: "CANCELLED" } },
    },
    select: { name: true, unit: true, quantity: true, priceEur: true },
    orderBy: { invoice: { issueDate: "desc" } },
  });

  if (items.length === 0) return NextResponse.json({ suggestions: [] });

  const map = new Map<string, { name: string; unit: string; priceSum: number; qtySum: number; count: number }>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.priceSum += Number(item.priceEur);
      existing.qtySum   += Number(item.quantity);
      existing.count    += 1;
    } else {
      map.set(key, {
        name:     item.name.trim(),
        unit:     item.unit ?? "buc",
        priceSum: Number(item.priceEur),
        qtySum:   Number(item.quantity),
        count:    1,
      });
    }
  }

  const suggestions = Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((s, i) => ({
      position:    i + 1,
      name:        s.name,
      unit:        s.unit,
      quantity:    Math.round((s.qtySum / s.count) * 100) / 100,
      priceEur:    Math.round((s.priceSum / s.count) * 100) / 100,
      subtotalEur: 0,
      subtotalRon: 0,
      usedCount:   s.count,
    }));

  return NextResponse.json({ suggestions });
}