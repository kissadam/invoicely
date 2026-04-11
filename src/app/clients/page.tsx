export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import AddClientForm from "@/components/AddClientForm";
import ClientsTable from "@/components/ClientsTable";
import { requirePageSession } from "@/lib/session";
import { cookies } from "next/headers";
import { getT } from "@/lib/i18n";

export default async function ClientsPage() {
  const userId = await requirePageSession();
  const locale = cookies().get("locale")?.value;
  const t = getT(locale);

  const clients = await prisma.client.findMany({
    where: { userId },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.clients.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.clients.countLabel(clients.length)}</p>
        </div>
        <AddClientForm />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {clients.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t.clients.noClients}</p>
          </div>
        ) : (
          <ClientsTable initial={clients} />
        )}
      </div>
    </div>
  );
}