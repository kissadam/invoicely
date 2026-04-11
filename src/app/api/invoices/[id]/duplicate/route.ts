export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/invoices/:id/duplicate
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/calculations";
import { requireActiveCompany } from "@/lib/session";
import { getPlanLimits } from "@/lib/plans";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, companyId, plan, error } = await requireActiveCompany();
  if (error) return error;

  // ── Monthly invoice limit check ──────────────────────────────────────────
  const limits = getPlanLimits(plan);
  if (limits.invoicesPerMonth !== Infinity) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthCount = await prisma.invoice.count({
      where: { companyId, createdAt: { gte: startOfMonth } },
    });
    if (monthCount >= limits.invoicesPerMonth) {
      return NextResponse.json(
        { error: `Ai atins limita de ${limits.invoicesPerMonth} facturi/lună pentru planul Free. Fă upgrade la Pro pentru facturi nelimitate.` },
        { status: 403 }
      );
    }
  }

  const source = await prisma.invoice.findFirst({
    where: { id: params.id, companyId },
    include: { items: true },
  });
  if (!source) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });

  const year  = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { companyId } });
  const number = generateInvoiceNumber(year, count + 1);

  const copy = await prisma.invoice.create({
    data: {
      number,
      userId,
      clientId:   source.clientId,
      companyId,
      templateId: source.templateId,
      status:     "SENT",
      issueDate:  new Date(),
      dueDate:    source.dueDate,
      exchangeRate: source.exchangeRate,
      totalEur:   source.totalEur,
      totalRon:   source.totalRon,
      notes:      source.notes,
      footerText: source.footerText,
      items: {
        create: source.items.map((item) => ({
          position:    item.position,
          name:        item.name,
          unit:        item.unit,
          quantity:    item.quantity,
          priceEur:    item.priceEur,
          subtotalEur: item.subtotalEur,
          subtotalRon: item.subtotalRon,
        })),
      },
    },
    include: { items: true, client: true },
  });

  return NextResponse.json(copy, { status: 201 });
}