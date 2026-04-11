export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, TrendingUp, FileText, Users, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { requirePageSession } from "@/lib/session";
import { cookies } from "next/headers";
import { getT } from "@/lib/i18n";

async function getStats(userId: string) {
  const [total, unpaid, paid, clients] = await Promise.all([
    prisma.invoice.aggregate({
      where: { userId },
      _sum: { totalRon: true },
      _count: true,
    }),
    prisma.invoice.count({ where: { userId, status: { in: ["DRAFT", "SENT"] } } }),
    prisma.invoice.count({ where: { userId, status: "PAID"  } }),
    prisma.client.count({ where: { userId } }),
  ]);
  return { total, unpaid, paid, clients };
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
  SENT:      "bg-slate-100 text-slate-600",
  PAID:      "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

export default async function DashboardPage() {
  const userId = await requirePageSession();
  const locale = cookies().get("locale")?.value;
  const t = getT(locale);

  const company = await prisma.company.findFirst({ where: { userId } });
  if (!company) redirect("/onboarding");

  const [stats, recent] = await Promise.all([getStats(userId), getRecentInvoices(userId)]);

  const totalRon = Number(stats.total._sum.totalRon ?? 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.dashboard.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.dashboard.subtitle}</p>
        </div>
        <Link
          href="/invoices/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> {t.dashboard.newInvoice}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<TrendingUp size={20} className="text-blue-600" />}
          label={t.dashboard.totalInvoiced}
          value={formatCurrency(totalRon, "RON")}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<FileText size={20} className="text-slate-600" />}
          label={t.dashboard.totalInvoices}
          value={String(stats.total._count)}
          bg="bg-slate-50"
        />
        <StatCard
          icon={<Clock size={20} className="text-amber-600" />}
          label={t.dashboard.unpaid}
          value={String(stats.unpaid)}
          bg="bg-amber-50"
        />
        <StatCard
          icon={<Users size={20} className="text-green-600" />}
          label={t.dashboard.clients}
          value={String(stats.clients)}
          bg="bg-green-50"
        />
      </div>

      {/* Recent invoices */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.dashboard.recentInvoices}</h2>
          <Link href="/invoices" className="text-xs text-blue-600 hover:underline">
            {t.dashboard.viewAll}
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            {t.dashboard.noInvoices}{" "}
            <Link href="/invoices/new" className="text-blue-600 hover:underline">{t.dashboard.createFirst}</Link>.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-3 text-left font-medium">{t.dashboard.number}</th>
                <th className="px-6 py-3 text-left font-medium">{t.dashboard.client}</th>
                <th className="px-6 py-3 text-left font-medium">{t.dashboard.date}</th>
                <th className="px-6 py-3 text-right font-medium">{t.dashboard.totalRon}</th>
                <th className="px-6 py-3 text-center font-medium">{t.dashboard.status}</th>
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
                    {new Date(inv.issueDate).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-GB")}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                    {formatCurrency(Number(inv.totalRon), "RON")}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                      {t.status[inv.status as keyof typeof t.status] ?? inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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