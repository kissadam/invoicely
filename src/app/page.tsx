/**
 * Dashboard — shows key metrics and recent invoices
 */

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, TrendingUp, FileText, Users, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { requirePageSession } from "@/lib/session";

async function getStats(userId: string) {
  const [total, draft, paid, clients] = await Promise.all([
    prisma.invoice.aggregate({
      where: { userId },
      _sum: { totalRon: true },
      _count: true,
    }),
    prisma.invoice.count({ where: { userId, status: "DRAFT" } }),
    prisma.invoice.count({ where: { userId, status: "PAID"  } }),
    prisma.client.count({ where: { userId } }),
  ]);
  return { total, draft, paid, clients };
}

async function getRecentInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { userId },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-600",
  SENT:      "bg-blue-100 text-blue-700",
  PAID:      "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Ciornă", SENT: "Trimisă", PAID: "Plătită", CANCELLED: "Anulată",
};

export default async function DashboardPage() {
  const userId = await requirePageSession();
  const [stats, recent] = await Promise.all([getStats(userId), getRecentInvoices(userId)]);

  const totalRon = Number(stats.total._sum.totalRon ?? 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Bun venit! Gestionați facturile companiei.</p>
        </div>
        <Link
          href="/invoices/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Factură nouă
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<TrendingUp size={20} className="text-blue-600" />}
          label="Total facturi (RON)"
          value={formatCurrency(totalRon, "RON")}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<FileText size={20} className="text-slate-600" />}
          label="Total facturi"
          value={String(stats.total._count)}
          bg="bg-slate-50"
        />
        <StatCard
          icon={<Clock size={20} className="text-amber-600" />}
          label="Ciorne"
          value={String(stats.draft)}
          bg="bg-amber-50"
        />
        <StatCard
          icon={<Users size={20} className="text-green-600" />}
          label="Clienți"
          value={String(stats.clients)}
          bg="bg-green-50"
        />
      </div>

      {/* Recent invoices */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Facturi recente</h2>
          <Link href="/invoices" className="text-xs text-blue-600 hover:underline">
            Vezi toate →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            Nicio factură. <Link href="/invoices/new" className="text-blue-600 hover:underline">Creați prima factură</Link>.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-3 text-left font-medium">Număr</th>
                <th className="px-6 py-3 text-left font-medium">Client</th>
                <th className="px-6 py-3 text-left font-medium">Dată</th>
                <th className="px-6 py-3 text-right font-medium">Total RON</th>
                <th className="px-6 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <td className="px-6 py-3">
                    <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline font-medium">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{inv.client.name}</td>
                  <td className="px-6 py-3 text-slate-500">
                    {new Date(inv.issueDate).toLocaleDateString("ro-RO")}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                    {formatCurrency(Number(inv.totalRon), "RON")}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}