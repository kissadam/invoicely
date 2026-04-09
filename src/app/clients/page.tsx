export const dynamic = "force-dynamic";

/**
 * Clients list page
 */

import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import AddClientForm from "@/components/AddClientForm";
import ClientsTable from "@/components/ClientsTable";
import { requirePageSession } from "@/lib/session";

export default async function ClientsPage() {
  const userId = await requirePageSession();
  const clients = await prisma.client.findMany({
    where: { userId },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clienți</h1>
          <p className="text-sm text-slate-500 mt-1">{clients.length} clienți înregistrați</p>
        </div>
        <AddClientForm />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {clients.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Niciun client. Adăugați unul cu butonul de mai sus.</p>
          </div>
        ) : (
          <ClientsTable initial={clients} />
        )}
      </div>
    </div>
  );
}