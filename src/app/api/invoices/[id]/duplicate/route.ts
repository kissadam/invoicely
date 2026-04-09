/**
 * POST /api/invoices/:id/duplicate
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/calculations";
import { requireUserId } from "@/lib/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const source = await prisma.invoice.findFirst({
    where: { id: params.id, userId },
    include: { items: true },
  });
  if (!source) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });

  const year  = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { userId } });
  const number = generateInvoiceNumber(year, count + 1);

  const copy = await prisma.invoice.create({
    data: {
      number,
      userId,
      clientId:   source.clientId,
      companyId:  source.companyId,
      templateId: source.templateId,
      status:     "DRAFT",
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