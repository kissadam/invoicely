export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/lib/session";
import { formatCurrency } from "@/lib/calculations";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Users, Package } from "lucide-react";
import RevenueChart from "@/components/analytics/RevenueChart";

// ── helpers ─────────────────────────────────────────────────────────────────

function effectiveTotal(inv: { totalRon: unknown; totalWithVatRon: unknown }) {
  return Number((inv.totalWithVatRon as number | null) ?? inv.totalRon);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const RO_MONTHS = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function trendIcon(pct: number) {
  if (pct > 3)  return { icon: TrendingUp,   color: "text-green-600",  bg: "bg-green-50",  label: `+${pct.toFixed(0)}%` };
  if (pct < -3) return { icon: TrendingDown, color: "text-red-500",    bg: "bg-red-50",    label: `${pct.toFixed(0)}%` };
  return          { icon: Minus,           color: "text-slate-400",  bg: "bg-slate-50",  label: "~0%" };
}

// ── page ────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const userId = await requirePageSession();
  const now = new Date();

  // Fetch all non-cancelled invoices
  const invoices = await prisma.invoice.findMany({
    where: { userId, status: { not: "CANCELLED" } },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { issueDate: "asc" },
  });

  // ── KPI data ──────────────────────────────────────────────────────────────

  const thisMonthKey = monthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey  = monthKey(lastMonthDate);

  const paid     = invoices.filter((i) => i.status === "PAID");
  const billed   = invoices.filter((i) => i.status === "SENT" || i.status === "PAID");
  const overdue  = invoices.filter(
    (i) => i.status === "SENT" && i.dueDate && new Date(i.dueDate) < now
  );

  const totalCollected = paid.reduce((s, i) => s + effectiveTotal(i), 0);
  const totalBilled    = billed.reduce((s, i) => s + effectiveTotal(i), 0);
  const totalOverdue   = overdue.reduce((s, i) => s + effectiveTotal(i), 0);

  // DSO — avg days from issue to updatedAt for paid invoices
  const dso = paid.length > 0
    ? Math.round(
        paid.reduce((s, i) => {
          const days = (new Date(i.updatedAt).getTime() - new Date(i.issueDate).getTime()) / 86_400_000;
          return s + Math.max(days, 0);
        }, 0) / paid.length
      )
    : null;

  // Month-over-month for collected
  const collectedThisMonth = paid.filter((i) => monthKey(new Date(i.issueDate)) === thisMonthKey).reduce((s, i) => s + effectiveTotal(i), 0);
  const collectedLastMonth = paid.filter((i) => monthKey(new Date(i.issueDate)) === lastMonthKey).reduce((s, i) => s + effectiveTotal(i), 0);
  const collectedMoM = collectedLastMonth > 0 ? ((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100 : 0;

  // ── Invoice funnel ────────────────────────────────────────────────────────

  const allInvoices = await prisma.invoice.findMany({ where: { userId } });
  const funnelSent      = allInvoices.filter((i) => i.status === "SENT").length;
  const funnelPaid      = allInvoices.filter((i) => i.status === "PAID").length;
  const funnelCancelled = allInvoices.filter((i) => i.status === "CANCELLED").length;
  const funnelTotal     = allInvoices.length;
  const conversionRate  = funnelTotal > 0 ? Math.round((funnelPaid / funnelTotal) * 100) : 0;

  // ── Revenue trend (last 12 months) ───────────────────────────────────────

  const months12: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months12.push(monthKey(d));
  }

  const revenueByMonth: Record<string, number> = {};
  for (const mk of months12) revenueByMonth[mk] = 0;
  for (const inv of paid) {
    const mk = monthKey(new Date(inv.issueDate));
    if (mk in revenueByMonth) revenueByMonth[mk] += effectiveTotal(inv);
  }

  const chartData = months12.map((mk) => ({
    month: RO_MONTHS[parseInt(mk.split("-")[1]) - 1],
    value: Math.round(revenueByMonth[mk]),
    isCurrent: mk === thisMonthKey,
  }));

  // ── Top clients ───────────────────────────────────────────────────────────

  const clientMap: Record<string, { name: string; total: number; count: number }> = {};
  for (const inv of billed) {
    const id = inv.client.id;
    if (!clientMap[id]) clientMap[id] = { name: inv.client.name, total: 0, count: 0 };
    clientMap[id].total += effectiveTotal(inv);
    clientMap[id].count++;
  }
  const topClients = Object.values(clientMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // ── Service revenue breakdown ────────────────────────────────────────────

  const serviceItems = await prisma.invoiceItem.findMany({
    where: {
      invoice: {
        userId,
        status: { in: ["PAID", "SENT"] },
      },
    },
    select: {
      name: true,
      quantity: true,
      priceEur: true,
      subtotalRon: true,
    },
  });

  const serviceMap: Record<string, { total: number; count: number; totalQty: number }> = {};
  for (const item of serviceItems) {
    const key = item.name.trim();
    if (!key) continue;
    if (!serviceMap[key]) serviceMap[key] = { total: 0, count: 0, totalQty: 0 };
    serviceMap[key].total    += Number(item.subtotalRon);
    serviceMap[key].count    += 1;
    serviceMap[key].totalQty += Number(item.quantity);
  }
  const topServices = Object.entries(serviceMap)
    .map(([name, s]) => ({
      name,
      total: Math.round(s.total),
      count: s.count,
      avgPrice: s.totalQty > 0 ? s.total / s.totalQty : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const serviceMaxTotal = topServices[0]?.total ?? 1;

  // ── Overdue aging ─────────────────────────────────────────────────────────

  const aging = { d30: 0, d60: 0, d90: 0, d90plus: 0 };
  for (const inv of overdue) {
    const days = Math.floor((now.getTime() - new Date(inv.dueDate!).getTime()) / 86_400_000);
    const amt  = effectiveTotal(inv);
    if      (days <= 30) aging.d30     += amt;
    else if (days <= 60) aging.d60     += amt;
    else if (days <= 90) aging.d90     += amt;
    else                 aging.d90plus += amt;
  }

  // ── Forecast ─────────────────────────────────────────────────────────────

  // Pipeline: open (SENT, not yet overdue) invoices expected to come in
  const pipeline = invoices.filter((i) => i.status === "SENT" && (!i.dueDate || new Date(i.dueDate) >= now));
  const pipelineTotal = pipeline.reduce((s, i) => s + effectiveTotal(i), 0);

  // 3-month average revenue (last 3 completed months)
  const last3Keys = months12.slice(-4, -1); // exclude current month
  const last3Avg = last3Keys.length > 0
    ? last3Keys.reduce((s, mk) => s + (revenueByMonth[mk] ?? 0), 0) / last3Keys.length
    : 0;

  // Projected total for current month = already collected + pipeline capped at avg
  const projectedThisMonth = Math.round(collectedThisMonth + Math.min(pipelineTotal, last3Avg * 1.5));

  // ── AI Insights ───────────────────────────────────────────────────────────

  type Insight = { icon: string; text: string; color: "green" | "red" | "amber" | "blue" | "slate" };
  const insights: Insight[] = [];

  // MoM revenue
  if (collectedLastMonth > 0) {
    if (collectedMoM >= 10) {
      insights.push({ icon: "🚀", text: `Venituri cu ${collectedMoM.toFixed(0)}% mai mari față de luna trecută`, color: "green" });
    } else if (collectedMoM <= -10) {
      insights.push({ icon: "📉", text: `Venituri cu ${Math.abs(collectedMoM).toFixed(0)}% mai mici față de luna trecută`, color: "red" });
    } else {
      insights.push({ icon: "📊", text: `Venituri stabile față de luna trecută (${collectedMoM > 0 ? "+" : ""}${collectedMoM.toFixed(0)}%)`, color: "slate" });
    }
  }

  // Overdue alert
  if (overdue.length > 0) {
    insights.push({ icon: "⚠️", text: `${overdue.length} ${overdue.length === 1 ? "factură restantă" : "facturi restante"} în valoare de ${formatCurrency(totalOverdue, "RON")}`, color: "red" });
  } else if (billed.length > 0) {
    insights.push({ icon: "✅", text: "Toate facturile sunt încasate la termen", color: "green" });
  }

  // Top client
  if (topClients.length > 0) {
    const top = topClients[0];
    const pct = totalBilled > 0 ? (top.total / totalBilled) * 100 : 0;
    if (pct >= 50) {
      insights.push({ icon: "🎯", text: `${top.name} reprezintă ${pct.toFixed(0)}% din venituri — risc de concentrare`, color: "amber" });
    } else {
      insights.push({ icon: "🏆", text: `Cel mai valoros client: ${top.name} (${formatCurrency(top.total, "RON")})`, color: "blue" });
    }
  }

  // DSO insight
  if (dso !== null) {
    if (dso <= 14) {
      insights.push({ icon: "⚡", text: `Timp mediu de încasare excelent: ${dso} zile`, color: "green" });
    } else if (dso >= 45) {
      insights.push({ icon: "🐢", text: `Timp mediu de încasare ridicat: ${dso} zile — urmăriți clienții`, color: "amber" });
    }
  }

  // Pipeline
  if (pipelineTotal > 0) {
    insights.push({ icon: "💰", text: `${pipeline.length} ${pipeline.length === 1 ? "factură" : "facturi"} în așteptare: ${formatCurrency(pipelineTotal, "RON")} de încasat`, color: "blue" });
  }

  const trend = trendIcon(collectedMoM);
  const TrendIcon = trend.icon;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Performanța financiară a companiei tale</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Încasat"
          value={formatCurrency(totalCollected, "RON")}
          sub={
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${trend.bg} ${trend.color}`}>
              <TrendIcon size={11} />
              {trend.label} față de luna trecută
            </span>
          }
          accent="green"
        />
        <KpiCard
          label="Facturat (total)"
          value={formatCurrency(totalBilled, "RON")}
          sub={<span className="text-xs text-slate-400">{billed.length} facturi emise</span>}
          accent="blue"
        />
        <KpiCard
          label="Restanțe"
          value={formatCurrency(totalOverdue, "RON")}
          sub={<span className="text-xs text-slate-400">{overdue.length} {overdue.length === 1 ? "factură" : "facturi"} neîncasate</span>}
          accent={totalOverdue > 0 ? "red" : "slate"}
        />
        <KpiCard
          label="DSO mediu"
          value={dso !== null ? `${dso} zile` : "—"}
          sub={<span className="text-xs text-slate-400">zile medii până la încasare</span>}
          accent="amber"
        />
      </div>

      {/* ── AI Insights ── */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {insights.map((ins, i) => {
            const colorMap = {
              green: "bg-green-50 border-green-100 text-green-800",
              red:   "bg-red-50 border-red-100 text-red-800",
              amber: "bg-amber-50 border-amber-100 text-amber-800",
              blue:  "bg-blue-50 border-blue-100 text-blue-800",
              slate: "bg-slate-50 border-slate-100 text-slate-700",
            };
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${colorMap[ins.color]}`}>
                <span className="text-base leading-none">{ins.icon}</span>
                {ins.text}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Forecast ── */}
      {(pipelineTotal > 0 || last3Avg > 0) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Medie lunară (3 luni)</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(Math.round(last3Avg), "RON")}</p>
            <p className="text-xs text-slate-400 mt-1">bază de referință</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-100 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pipeline activ</p>
            <p className="text-2xl font-bold text-blue-700 tabular-nums">{formatCurrency(Math.round(pipelineTotal), "RON")}</p>
            <p className="text-xs text-slate-400 mt-1">{pipeline.length} {pipeline.length === 1 ? "factură" : "facturi"} neîncasate</p>
          </div>
          <div className="bg-white rounded-xl border border-violet-100 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Proiecție luna curentă</p>
            <p className="text-2xl font-bold text-violet-700 tabular-nums">{formatCurrency(projectedThisMonth, "RON")}</p>
            <p className="text-xs text-slate-400 mt-1">{formatCurrency(Math.round(collectedThisMonth), "RON")} încasat + pipeline</p>
          </div>
        </div>
      )}

      {/* ── Revenue chart + Funnel ── */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Venituri încasate</h2>
              <p className="text-xs text-slate-400 mt-0.5">Ultimele 12 luni (RON)</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-900 tabular-nums">
                {formatCurrency(collectedThisMonth, "RON")}
              </div>
              <div className="text-xs text-slate-400">luna curentă</div>
            </div>
          </div>
          <RevenueChart data={chartData} currency="RON" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Starea facturilor</h2>
          <p className="text-xs text-slate-400 mb-5">Rata conversie: <span className="font-semibold text-slate-700">{conversionRate}%</span></p>
          <div className="space-y-3">
            <FunnelRow label="Pregătită" count={funnelSent}      total={funnelTotal} color="bg-slate-400"  />
            <FunnelRow label="Plătită"  count={funnelPaid}      total={funnelTotal} color="bg-green-500"  />
            <FunnelRow label="Anulată"  count={funnelCancelled} total={funnelTotal} color="bg-red-300"    />
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 size={13} className="text-green-500" />
            {funnelPaid} din {funnelTotal} facturi plătite
          </div>
        </div>
      </div>

      {/* ── Service revenue breakdown ── */}
      {topServices.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Package size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Servicii facturate</h2>
            <span className="text-xs text-slate-400 ml-auto">venituri per serviciu (RON, facturi emise + plătite)</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {topServices.map((s, i) => {
              const pct = serviceMaxTotal > 0 ? (s.total / serviceMaxTotal) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}.</span>
                      <span className="text-sm font-medium text-slate-700 truncate">{s.name}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(s.total, "RON")}</span>
                      <span className="text-xs text-slate-400 ml-1.5">{s.count}×</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top clients + Overdue aging ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* Top Clients */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Top clienți</h2>
          </div>
          {topClients.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nicio factură emisă încă</p>
          ) : (
            <div className="space-y-3">
              {topClients.map((c, i) => {
                const pct = totalBilled > 0 ? (c.total / totalBilled) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}.</span>
                        <span className="text-sm font-medium text-slate-700 truncate">{c.name}</span>
                        <span className="text-xs text-slate-400 shrink-0">{c.count} fact.</span>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-sm font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(c.total, "RON")}
                        </span>
                        <span className="text-xs text-slate-400 ml-1.5">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overdue Aging */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={15} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-800">Restanțe pe grupe de vârstă</h2>
          </div>
          {totalOverdue === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 size={28} className="text-green-400" />
              <p className="text-sm text-slate-500 font-medium">Toate facturile sunt la zi!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AgingRow label="1–30 zile"  amount={aging.d30}     total={totalOverdue} color="bg-amber-300"  />
              <AgingRow label="31–60 zile" amount={aging.d60}     total={totalOverdue} color="bg-orange-400" />
              <AgingRow label="61–90 zile" amount={aging.d90}     total={totalOverdue} color="bg-red-400"    />
              <AgingRow label="90+ zile"   amount={aging.d90plus} total={totalOverdue} color="bg-red-600"    />
              <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-semibold text-slate-800">
                <span>Total restanțe</span>
                <span className="tabular-nums text-red-600">{formatCurrency(totalOverdue, "RON")}</span>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ── sub-components ───────────────────────────────────────────────────────────

const accentMap = {
  green: { icon: "bg-green-100", border: "border-green-100", dot: "bg-green-500" },
  blue:  { icon: "bg-blue-100",  border: "border-blue-100",  dot: "bg-blue-500"  },
  red:   { icon: "bg-red-50",    border: "border-red-100",   dot: "bg-red-500"   },
  amber: { icon: "bg-amber-50",  border: "border-amber-100", dot: "bg-amber-500" },
  slate: { icon: "bg-slate-100", border: "border-slate-100", dot: "bg-slate-400" },
};

function KpiCard({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  accent: keyof typeof accentMap;
}) {
  const a = accentMap[accent];
  return (
    <div className={`bg-white rounded-xl border ${a.border} p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${a.dot}`} />
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums mb-2">{value}</p>
      {sub}
    </div>
  );
}

function FunnelRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-500 tabular-nums">{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AgingRow({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-slate-600 font-medium">{label}</span>
        <span className="text-sm font-semibold text-slate-800 tabular-nums">
          {formatCurrency(amount, "RON")}
          {amount > 0 && <span className="text-xs text-slate-400 ml-1.5">{pct.toFixed(0)}%</span>}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}