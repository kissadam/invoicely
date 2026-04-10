export const dynamic = "force-dynamic";

/**
 * Invoices list page
 */

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, FileDown } from "lucide-react";
import InvoicesTable from "@/components/InvoicesTable";
import { requirePageSession } from "@/lib/session";

export default async function InvoicesPage() {
  const userId = await requirePageSession();
  const invoices = await prisma.invoice.findMany({
    where: { userId },
    include: { client: { select: { name: true, cui: true, vatPayer: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturi</h1>
          <p className="text-sm text-slate-500 mt-1">{invoices.length} factură(i)</p>
        </div>
        <Link
          href="/invoices/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Factură nouă
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <FileDown size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nicio factură creată.</p>
            <Link href="/invoices/new" className="text-blue-600 hover:underline text-sm mt-1 inline-block">
              Creați prima factură
            </Link>
          </div>
        ) : (
          <InvoicesTable initial={invoices} />
        )}
      </div>
    </div>
  );
}