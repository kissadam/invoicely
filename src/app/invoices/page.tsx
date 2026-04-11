export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, FileDown } from "lucide-react";
import InvoicesTable from "@/components/InvoicesTable";
import { requirePageSession } from "@/lib/session";
import { cookies } from "next/headers";
import { getT } from "@/lib/i18n";

export default async function InvoicesPage() {
  const userId = await requirePageSession();
  const locale = cookies().get("locale")?.value;
  const t = getT(locale);

  const invoices = await prisma.invoice.findMany({
    where: { userId },
    include: { client: { select: { name: true, cui: true, vatPayer: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.invoices.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.invoices.countLabel(invoices.length)}</p>
        </div>
        <Link
          href="/invoices/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> {t.invoices.newInvoice}
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <FileDown size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t.invoices.noInvoices}</p>
            <Link href="/invoices/new" className="text-blue-600 hover:underline text-sm mt-1 inline-block">
              {t.invoices.createFirst}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <InvoicesTable initial={invoices} />
          </div>
        )}
      </div>
    </div>
  );
}