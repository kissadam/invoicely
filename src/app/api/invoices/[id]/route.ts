export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET    /api/invoices/:id
 * PATCH  /api/invoices/:id
 * DELETE /api/invoices/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeInvoice } from "@/lib/calculations";
import { requireActiveCompany } from "@/lib/session";
import type { InvoiceItemForm } from "@/types/invoice";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { companyId, error } = await requireActiveCompany();
  if (error) return error;

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, companyId },
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
  const { companyId, error } = await requireActiveCompany();
  if (error) return error;

  const existing = await prisma.invoice.findFirst({
    where: { id: params.id, companyId },
  });
  if (!existing) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });

  const body = await req.json();

  if (body.exchangeRate !== undefined && (body.exchangeRate <= 0 || body.exchangeRate > 100_000))
    return NextResponse.json({ error: "exchangeRate invalid" }, { status: 400 });
  if (body.vatRate !== undefined && (body.vatRate < 0 || body.vatRate > 100))
    return NextResponse.json({ error: "vatRate invalid" }, { status: 400 });
  if (body.items) {
    for (const item of body.items) {
      if (Number(item.quantity) <= 0 || Number(item.quantity) > 1_000_000)
        return NextResponse.json({ error: "Cantitate invalidă în articole" }, { status: 400 });
      if (Number(item.priceEur) < 0 || Number(item.priceEur) > 10_000_000)
        return NextResponse.json({ error: "Preț invalid în articole" }, { status: 400 });
    }
  }

  const exchangeRate = body.exchangeRate ?? Number(existing.exchangeRate);
  const vatRate = body.vatRate ?? 0;

  let totals: ReturnType<typeof computeInvoice>["totals"] | null = null;
  let itemsToCreate: InvoiceItemForm[] = [];

  if (body.items) {
    const computed = computeInvoice(body.items, exchangeRate, vatRate);
    totals = computed.totals;
    itemsToCreate = computed.items;
  }

  const invoice = await prisma.$transaction(async (tx) => {
    if (body.items) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: params.id } });
    }
    return tx.invoice.update({
      where: { id: params.id },
      data: {
        ...(body.status       && { status:     body.status }),
        ...(body.clientId     && { clientId:   body.clientId }),
        ...(body.currency     && { currency:   body.currency }),
        ...(body.number       && { number:     body.number }),
        ...(body.issueDate    && { issueDate:  new Date(body.issueDate) }),
        ...(body.dueDate    !== undefined && { dueDate:  body.dueDate  ? new Date(body.dueDate)  : null }),
        ...(body.shipDate   !== undefined && { shipDate: body.shipDate ? new Date(body.shipDate) : null }),
        ...(body.notes      !== undefined && { notes:      body.notes      }),
        ...(body.footerText !== undefined && { footerText: body.footerText }),
        ...(body.exchangeRate && { exchangeRate: body.exchangeRate }),
        ...(totals && {
          totalEur:        totals.totalEur,
          totalRon:        totals.totalRon,
          vatRate:         vatRate > 0 ? vatRate : null,
          vatAmountRon:    vatRate > 0 ? totals.vatAmountRon    : null,
          totalWithVatRon: vatRate > 0 ? totals.totalWithVatRon : null,
        }),
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
  const { companyId, error } = await requireActiveCompany();
  if (error) return error;

  const existing = await prisma.invoice.findFirst({
    where: { id: params.id, companyId },
  });
  if (!existing) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });

  await prisma.invoice.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}