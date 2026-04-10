export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown, Copy, CheckCircle2 } from "lucide-react";
import { requirePageSession } from "@/lib/session";
import InvoiceEditor from "@/components/invoice/InvoiceEditor";
import type { EditableInvoice } from "@/components/invoice/InvoiceEditor";
import MarkPaidButton from "@/components/invoice/MarkPaidButton";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const userId = await requirePageSession();
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId },
    include: {
      items:   { orderBy: { position: "asc" } },
      client:  true,
      company: true,
    },
  });

  if (!invoice) notFound();

  const initialData: EditableInvoice = {
    number:       invoice.number,
    currency:     invoice.currency,
    issueDate:    invoice.issueDate.toISOString().split("T")[0],
    dueDate:      invoice.dueDate?.toISOString().split("T")[0]  ?? "",
    shipDate:     invoice.shipDate?.toISOString().split("T")[0] ?? "",
    notes:        invoice.notes        ?? "",
    footerText:   invoice.footerText   ?? "",
    exchangeRate: Number(invoice.exchangeRate),
    status:       invoice.status,
    client: {
      id:       invoice.client.id,
      cui:      invoice.client.cui      ?? "",
      name:     invoice.client.name,
      address:  invoice.client.address  ?? "",
      vatPayer: invoice.client.vatPayer,
    },
    items: invoice.items.map((item) => ({
      position:    item.position,
      name:        item.name,
      unit:        item.unit,
      quantity:    Number(item.quantity),
      priceEur:    Number(item.priceEur),
      subtotalEur: Number(item.subtotalEur),
      subtotalRon: Number(item.subtotalRon),
    })),
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/invoices" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft size={15} /> Înapoi
        </Link>
        <div className="flex-1 flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">{invoice.number}</h1>
          {invoice.status === "PAID" ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
              <CheckCircle2 size={11} /> Plătită
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              Pregătită
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <MarkPaidButton invoiceId={invoice.id} currentStatus={invoice.status} />
          <Link
            href={`/invoices/new?duplicate=${invoice.id}`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <Copy size={14} /> Duplică
          </Link>
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FileDown size={14} /> PDF
          </a>
        </div>
      </div>

      <InvoiceEditor invoiceId={invoice.id} initialData={initialData} readOnly={invoice.status === "PAID"} />
    </div>
  );
}