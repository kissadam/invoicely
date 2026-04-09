/**
 * Invoice detail page — view, change status, download PDF, duplicate
 */

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/calculations";
import { formatExchangeRateLine } from "@/lib/bnr";
import { ArrowLeft, FileDown, Copy } from "lucide-react";
import { requirePageSession } from "@/lib/session";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-600",
  SENT:      "bg-blue-100 text-blue-700",
  PAID:      "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Ciornă", SENT: "Trimisă", PAID: "Plătită", CANCELLED: "Anulată",
};

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const userId = await requirePageSession();
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId },
    include: {
      items: { orderBy: { position: "asc" } },
      client: true,
      company: true,
    },
  });

  if (!invoice) notFound();

  const rate = Number(invoice.exchangeRate);
  const exchangeLine = invoice.currency !== "RON"
    ? formatExchangeRateLine(rate, invoice.currency, invoice.issueDate.toISOString())
    : "";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/invoices" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft size={15} /> Înapoi
        </Link>
        <div className="flex-1 flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">{invoice.number}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[invoice.status]}`}>
            {STATUS_LABELS[invoice.status]}
          </span>
        </div>
        <div className="flex gap-2">
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
            <FileDown size={14} /> Descarcă PDF
          </a>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Parties */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-slate-50 dark:bg-slate-750 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Furnizor</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{invoice.company?.name ?? "—"}</p>
              {invoice.company?.cui && <p className="text-xs text-slate-500 mt-1">CUI: {invoice.company.cui}</p>}
              {invoice.company?.address && <p className="text-xs text-slate-500">{invoice.company.address}</p>}
            </div>
            <div className="bg-slate-50 dark:bg-slate-750 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Client {invoice.client.vatPayer ? "(Plătitor TVA)" : "(Neplătitor TVA)"}
              </p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{invoice.client.name}</p>
              {invoice.client.cui && <p className="text-xs text-slate-500 mt-1">CUI: {invoice.client.cui}</p>}
              {invoice.client.address && <p className="text-xs text-slate-500">{invoice.client.address}</p>}
            </div>
          </div>

          {/* Meta */}
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase">Data emiterii</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{fmtDate(invoice.issueDate)}</p>
            </div>
            {invoice.shipDate && (
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Data expediției</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{fmtDate(invoice.shipDate)}</p>
              </div>
            )}
            {invoice.dueDate && (
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase">Termen de plată</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{fmtDate(invoice.dueDate)}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 italic">{exchangeLine}</p>

          {/* Items table */}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white text-xs uppercase tracking-wide">
                {["Nr.", "Denumire", "U.M.", "Cantitate", "Preț EUR", "Subtotal EUR", "Subtotal RON"].map((h, i) => (
                  <th key={i} className={`px-3 py-2.5 font-semibold ${i === 0 || i === 2 ? "text-center" : i >= 3 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700 even:bg-slate-50 dark:even:bg-slate-750">
                  <td className="px-3 py-2 text-center text-slate-500">{item.position}</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{item.name}</td>
                  <td className="px-3 py-2 text-center text-slate-500">{item.unit}</td>
                  <td className="px-3 py-2 text-right">{Number(item.quantity)}</td>
                  <td className="px-3 py-2 text-right">{Number(item.priceEur).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{Number(item.subtotalEur).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{Number(item.subtotalRon).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="min-w-[260px] space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Total EUR</span>
                <span className="font-medium">{formatCurrency(Number(invoice.totalEur), "EUR")}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
                <span>Total de plată (RON)</span>
                <span>{formatCurrency(Number(invoice.totalRon), "RON")}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">Mențiuni: </span>{invoice.notes}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-xs text-slate-400 italic">
              {invoice.footerText ?? "Factura circulă fără semnătura și ștampila conform Lg. 227/2015-Codul fiscal art 319(aliniat 29)."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}