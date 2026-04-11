export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET  /api/invoices  — list invoices for active company
 * POST /api/invoices  — create invoice (enforces monthly limit)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeInvoice, generateInvoiceNumber } from "@/lib/calculations";
import { requireActiveCompany } from "@/lib/session";
import { getPlanLimits } from "@/lib/plans";
import type { InvoiceItemForm } from "@/types/invoice";

export async function GET(req: NextRequest) {
  const { companyId, error } = await requireActiveCompany();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const page   = parseInt(searchParams.get("page")  ?? "1",  10);
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  const where = {
    companyId,
    ...(status ? { status: status as "DRAFT" | "SENT" | "PAID" | "CANCELLED" } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, cui: true, vatPayer: true } },
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
    vatRate?: number;
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
  if (!body.exchangeRate || body.exchangeRate <= 0 || body.exchangeRate > 100_000)
    return NextResponse.json({ error: "exchangeRate invalid" }, { status: 400 });
  if (!body.items?.length)         return NextResponse.json({ error: "Factura trebuie să conțină cel puțin un articol" }, { status: 400 });

  const vatRate = body.vatRate ?? 0;
  if (vatRate < 0 || vatRate > 100) return NextResponse.json({ error: "vatRate invalid" }, { status: 400 });

  for (const item of body.items) {
    if (Number(item.quantity) <= 0 || Number(item.quantity) > 1_000_000)
      return NextResponse.json({ error: "Cantitate invalidă în articole" }, { status: 400 });
    if (Number(item.priceEur) < 0 || Number(item.priceEur) > 10_000_000)
      return NextResponse.json({ error: "Preț invalid în articole" }, { status: 400 });
  }

  let number = body.invoiceNumber?.trim();
  if (!number) {
    const year  = new Date().getFullYear();
    const count = await prisma.invoice.count({ where: { companyId } });
    number = generateInvoiceNumber(year, count + 1);
  }
  const { items: computedItems, totals } = computeInvoice(body.items, body.exchangeRate, vatRate);

  const invoice = await prisma.invoice.create({
    data: {
      number,
      userId,
      clientId:       body.clientId,
      companyId,
      templateId:     body.templateId,
      status:         "SENT",
      currency:       body.currency ?? "RON",
      issueDate:      body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate:        body.dueDate   ? new Date(body.dueDate)   : null,
      shipDate:       body.shipDate  ? new Date(body.shipDate)  : null,
      exchangeRate:   body.exchangeRate,
      totalEur:       totals.totalEur,
      totalRon:       totals.totalRon,
      vatRate:        vatRate > 0 ? vatRate : null,
      vatAmountRon:   vatRate > 0 ? totals.vatAmountRon   : null,
      totalWithVatRon: vatRate > 0 ? totals.totalWithVatRon : null,
      notes:          body.notes,
      footerText:     body.footerText,
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