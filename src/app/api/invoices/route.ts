export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET  /api/invoices  — list invoices
 * POST /api/invoices  — create invoice
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeInvoice, generateInvoiceNumber } from "@/lib/calculations";
import { requireUserId } from "@/lib/session";
import type { InvoiceItemForm } from "@/types/invoice";

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const page   = parseInt(searchParams.get("page")  ?? "1",  10);
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  const where = {
    userId,
    ...(status ? { status: status as "DRAFT" | "SENT" | "PAID" | "CANCELLED" } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, cui: true } },
        items:  { orderBy: { position: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({ invoices, total, page, limit });
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  let body: {
    clientId: string;
    invoiceNumber?: string;
    companyId?: string;
    templateId?: string;
    currency?: string;
    issueDate?: string;
    dueDate?: string;
    shipDate?: string;
    exchangeRate: number;
    notes?: string;
    footerText?: string;
    items: InvoiceItemForm[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.clientId)              return NextResponse.json({ error: "clientId este obligatoriu" }, { status: 400 });
  if (!body.exchangeRate || body.exchangeRate <= 0) return NextResponse.json({ error: "exchangeRate invalid" }, { status: 400 });
  if (!body.items?.length)         return NextResponse.json({ error: "Factura trebuie să conțină cel puțin un articol" }, { status: 400 });

  let number = body.invoiceNumber?.trim();
  if (!number) {
    const year  = new Date().getFullYear();
    const count = await prisma.invoice.count({ where: { userId } });
    number = generateInvoiceNumber(year, count + 1);
  }

  const { items: computedItems, totals } = computeInvoice(body.items, body.exchangeRate);

  const invoice = await prisma.invoice.create({
    data: {
      number,
      userId,
      clientId:   body.clientId,
      companyId:  body.companyId,
      templateId: body.templateId,
      currency:   body.currency ?? "RON",
      issueDate:  body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate:    body.dueDate   ? new Date(body.dueDate)   : null,
      shipDate:   body.shipDate  ? new Date(body.shipDate)  : null,
      exchangeRate: body.exchangeRate,
      totalEur:   totals.totalEur,
      totalRon:   totals.totalRon,
      notes:      body.notes,
      footerText: body.footerText,
      items: {
        create: computedItems.map((item) => ({
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
    include: {
      items:   { orderBy: { position: "asc" } },
      client:  true,
      company: true,
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}