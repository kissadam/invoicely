export const dynamic = "force-dynamic";

/**
 * GET    /api/invoices/:id
 * PATCH  /api/invoices/:id
 * DELETE /api/invoices/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeInvoice } from "@/lib/calculations";
import { requireUserId } from "@/lib/session";
import type { InvoiceItemForm } from "@/types/invoice";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId },
    include: {
      items:    { orderBy: { position: "asc" } },
      client:   true,
      company:  true,
      template: true,
    },
  });

  if (!invoice) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const existing = await prisma.invoice.findFirst({
    where: { id: params.id, userId },
  });
  if (!existing) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });

  const body = await req.json();
  let totalsUpdate: { totalEur?: number; totalRon?: number } = {};
  let itemsToCreate: InvoiceItemForm[] = [];

  if (body.items) {
    const exchangeRate = body.exchangeRate ?? Number(existing.exchangeRate);
    const { items: computed, totals } = computeInvoice(body.items, exchangeRate);
    totalsUpdate = totals;
    itemsToCreate = computed;
  }

  const invoice = await prisma.$transaction(async (tx) => {
    if (body.items) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: params.id } });
    }
    return tx.invoice.update({
      where: { id: params.id },
      data: {
        ...(body.status     && { status:     body.status }),
        ...(body.dueDate    !== undefined && { dueDate:  body.dueDate  ? new Date(body.dueDate)  : null }),
        ...(body.shipDate   !== undefined && { shipDate: body.shipDate ? new Date(body.shipDate) : null }),
        ...(body.notes      !== undefined && { notes:      body.notes      }),
        ...(body.footerText !== undefined && { footerText: body.footerText }),
        ...(body.exchangeRate && { exchangeRate: body.exchangeRate }),
        ...totalsUpdate,
        ...(itemsToCreate.length > 0 && {
          items: {
            create: itemsToCreate.map((item) => ({
              position:    item.position,
              name:        item.name,
              unit:        item.unit,
              quantity:    item.quantity,
              priceEur:    item.priceEur,
              subtotalEur: item.subtotalEur,
              subtotalRon: item.subtotalRon,
            })),
          },
        }),
      },
      include: {
        items:   { orderBy: { position: "asc" } },
        client:  true,
        company: true,
      },
    });
  });

  return NextResponse.json(invoice);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const existing = await prisma.invoice.findFirst({
    where: { id: params.id, userId },
  });
  if (!existing) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });

  await prisma.invoice.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}