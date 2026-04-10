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

  // last3Keys / last3Avg used by both Run rate and Forecast — declare once here
  const last3Keys = months12.slice(-4, -1); // last 3 completed months
  const last3Avg  = last3Keys.length > 0
    ? last3Keys.reduce((s, mk) => s + (revenueByMonth[mk] ?? 0), 0) / last3Keys.length
    : 0;

  // ── Avg invoice value trend (12 months) ──────────────────────────────────

  const avgValueByMonth = months12.map((mk) => {
    const monthPaid = paid.filter((i) => monthKey(new Date(i.issueDate)) === mk);
    return {
      month: RO_MONTHS[parseInt(mk.split("-")[1]) - 1],
      avg: monthPaid.length > 0 ? Math.round(monthPaid.reduce((s, i) => s + effectiveTotal(i), 0) / monthPaid.length) : 0,
      count: monthPaid.length,
      isCurrent: mk === thisMonthKey,
    };
  });

  // ── Top clients + Pareto concentration ───────────────────────────────────

  const clientMap: Record<string, { name: string; total: number; count: number }> = {};
  for (const inv of billed) {
    const id = inv.client.id;
    if (!clientMap[id]) clientMap[id] = { name: inv.client.name, total: 0, count: 0 };
    clientMap[id].total += effectiveTotal(inv);
    clientMap[id].count++;
  }
  const allClientsSorted = Object.values(clientMap).sort((a, b) => b.total - a.total);
  const topClients = allClientsSorted.slice(0, 8);

  // Pareto: cumulative revenue % as clients are added in order
  let cumulative = 0;
  const paretoRows = allClientsSorted.map((c, i) => {
    cumulative += c.total;
    return {
      rank: i + 1,
      name: c.name,
      total: c.total,
      cumulativePct: totalBilled > 0 ? (cumulative / totalBilled) * 100 : 0,
      ownPct: totalBilled > 0 ? (c.total / totalBilled) * 100 : 0,
    };
  });
  // Find how many top clients cover 80% of revenue
  const top80Count = paretoRows.findIndex((r) => r.cumulativePct >= 80) + 1 || paretoRows.length;

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

  // ── Monthly breakdown table ──────────────────────────────────────────────

  // Count billed (SENT+PAID) invoices issued in each of the 12 months
  const issuedCountByMonth: Record<string, number> = {};
  const paidCountByMonth:   Record<string, number> = {};
  for (const mk of months12) { issuedCountByMonth[mk] = 0; paidCountByMonth[mk] = 0; }
  for (const inv of billed) {
    const mk = monthKey(new Date(inv.issueDate));
    if (mk in issuedCountByMonth) issuedCountByMonth[mk]++;
  }
  for (const inv of paid) {
    const mk = monthKey(new Date(inv.issueDate));
    if (mk in paidCountByMonth) paidCountByMonth[mk]++;
  }

  const monthlyRows = months12.map((mk, idx) => {
    const revenue    = revenueByMonth[mk] ?? 0;
    const prevRev    = idx > 0 ? (revenueByMonth[months12[idx - 1]] ?? 0) : null;
    const mom        = prevRev !== null && prevRev > 0 ? ((revenue - prevRev) / prevRev) * 100 : null;
    const issued     = issuedCountByMonth[mk] ?? 0;
    const paidCount  = paidCountByMonth[mk] ?? 0;
    const avgInvoice = paidCount > 0 ? revenue / paidCount : 0;
    const [year, month] = mk.split("-");
    return {
      label:  `${RO_MONTHS[parseInt(month) - 1]} ${year}`,
      mk,
      revenue: Math.round(revenue),
      issued,
      paidCount,
      avgInvoice: Math.round(avgInvoice),
      mom,
      isCurrent: mk === thisMonthKey,
    };
  }).reverse(); // most recent first

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

  // ── Year-over-year ────────────────────────────────────────────────────────

  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;
  const thisYearRev = paid.filter((i) => new Date(i.issueDate).getFullYear() === thisYear).reduce((s, i) => s + effectiveTotal(i), 0);
  const lastYearRev = paid.filter((i) => new Date(i.issueDate).getFullYear() === lastYear).reduce((s, i) => s + effectiveTotal(i), 0);
  const yoyPct = lastYearRev > 0 ? ((thisYearRev - lastYearRev) / lastYearRev) * 100 : null;
  const thisYearInvoices = billed.filter((i) => new Date(i.issueDate).getFullYear() === thisYear).length;
  const lastYearInvoices = billed.filter((i) => new Date(i.issueDate).getFullYear() === lastYear).length;

  // ── Currency breakdown ────────────────────────────────────────────────────

  const currencyMap: Record<string, { count: number; totalRon: number }> = {};
  for (const inv of billed) {
    const cur = (inv as { currency: string }).currency;
    if (!currencyMap[cur]) currencyMap[cur] = { count: 0, totalRon: 0 };
    currencyMap[cur].count++;
    currencyMap[cur].totalRon += effectiveTotal(inv);
  }
  const currencyRows = Object.entries(currencyMap)
    .map(([cur, v]) => ({ cur, ...v }))
    .sort((a, b) => b.totalRon - a.totalRon);
  const currencyMax = currencyRows[0]?.totalRon ?? 1;

  // ── Invoice size distribution ─────────────────────────────────────────────

  const sizeBuckets = [
    { label: "Micro  < 500 RON",      min: 0,    max: 500,   count: 0 },
    { label: "Mică   500–2 000 RON",  min: 500,  max: 2000,  count: 0 },
    { label: "Medie  2 000–10 000",   min: 2000, max: 10000, count: 0 },
    { label: "Mare   > 10 000 RON",   min: 10000,max: Infinity, count: 0 },
  ];
  for (const inv of billed) {
    const total = effectiveTotal(inv);
    const bucket = sizeBuckets.find((b) => total >= b.min && total < b.max);
    if (bucket) bucket.count++;
  }
  const sizeTotal = billed.length || 1;

  // ── Client payment behavior ───────────────────────────────────────────────

  const clientPayMap: Record<string, { name: string; dsoSum: number; count: number; lastDate: Date }> = {};
  for (const inv of paid) {
    const id   = inv.client.id;
    const days = Math.max(0, (new Date(inv.updatedAt).getTime() - new Date(inv.issueDate).getTime()) / 86_400_000);
    if (!clientPayMap[id]) clientPayMap[id] = { name: inv.client.name, dsoSum: 0, count: 0, lastDate: new Date(inv.issueDate) };
    clientPayMap[id].dsoSum += days;
    clientPayMap[id].count++;
    if (new Date(inv.issueDate) > clientPayMap[id].lastDate) clientPayMap[id].lastDate = new Date(inv.issueDate);
  }
  const clientPayRows = Object.values(clientPayMap)
    .map((c) => ({ ...c, avgDso: Math.round(c.dsoSum / c.count) }))
    .sort((a, b) => b.avgDso - a.avgDso)
    .slice(0, 10);
  const maxDso = clientPayRows[0]?.avgDso ?? 1;

  // ── Overdue invoice details ───────────────────────────────────────────────

  const overdueDetails = overdue
    .map((inv) => ({
      id:       inv.id,
      number:   (inv as { number: string }).number,
      client:   inv.client.name,
      amount:   effectiveTotal(inv),
      daysOver: Math.floor((now.getTime() - new Date(inv.dueDate!).getTime()) / 86_400_000),
      dueDate:  inv.dueDate!,
    }))
    .sort((a, b) => b.daysOver - a.daysOver);

  // ── New vs returning clients (last 6 months) ──────────────────────────────

  // First invoice date per client across all time
  const clientFirstSeen: Record<string, string> = {};
  for (const inv of invoices) {
    const id = inv.client.id;
    const mk = monthKey(new Date(inv.issueDate));
    if (!clientFirstSeen[id] || mk < clientFirstSeen[id]) clientFirstSeen[id] = mk;
  }

  const months6 = months12.slice(-6);
  const clientAcqRows = months6.map((mk) => {
    const monthInvs = billed.filter((i) => monthKey(new Date(i.issueDate)) === mk);
    const seen = new Set<string>();
    let newClients = 0, returningClients = 0;
    for (const inv of monthInvs) {
      if (seen.has(inv.client.id)) continue;
      seen.add(inv.client.id);
      if (clientFirstSeen[inv.client.id] === mk) newClients++;
      else returningClients++;
    }
    const [year, month] = mk.split("-");
    return { label: `${RO_MONTHS[parseInt(month) - 1]} ${year}`, mk, newClients, returningClients, total: newClients + returningClients, isCurrent: mk === thisMonthKey };
  });
  const maxAcqTotal = Math.max(...clientAcqRows.map((r) => r.total), 1);

  // ── Revenue heatmap (all-time by year × month) ────────────────────────────

  const heatYears = Array.from(new Set(paid.map((i) => new Date(i.issueDate).getFullYear()))).sort();
  const heatData: Record<number, Record<number, number>> = {};
  for (const y of heatYears) heatData[y] = {};
  for (const inv of paid) {
    const d = new Date(inv.issueDate);
    const y = d.getFullYear(), m = d.getMonth(); // 0-indexed
    heatData[y][m] = (heatData[y][m] ?? 0) + effectiveTotal(inv);
  }
  const heatMax = Math.max(...Object.values(heatData).flatMap((ym) => Object.values(ym)), 1);

  // ── Run rate ──────────────────────────────────────────────────────────────

  // Annualized run rate = last 3 completed months avg × 12
  const runRate = Math.round(last3Avg * 12);
  // Quarterly run rate = last 3 completed months total
  const quarterlyRate = Math.round(last3Keys.reduce((s, mk) => s + (revenueByMonth[mk] ?? 0), 0));
  // All-time best month
  const bestMonthEntry = Object.entries(revenueByMonth).reduce<[string, number] | null>(
    (best, [mk, val]) => (best === null || val > best[1] ? [mk, val] : best),
    null,
  );
  const bestMonthLabel = bestMonthEntry
    ? `${RO_MONTHS[parseInt(bestMonthEntry[0].split("-")[1]) - 1]} ${bestMonthEntry[0].split("-")[0]}`
    : null;

  // ── At-risk clients (no invoice in 60+ days) ──────────────────────────────

  const clientLastSeen: Record<string, { name: string; lastDate: Date; totalRev: number }> = {};
  for (const inv of billed) {
    const id = inv.client.id;
    const d  = new Date(inv.issueDate);
    if (!clientLastSeen[id]) clientLastSeen[id] = { name: inv.client.name, lastDate: d, totalRev: 0 };
    if (d > clientLastSeen[id].lastDate) clientLastSeen[id].lastDate = d;
    clientLastSeen[id].totalRev += effectiveTotal(inv);
  }
  const atRiskClients = Object.values(clientLastSeen)
    .map((c) => ({ ...c, daysSince: Math.floor((now.getTime() - c.lastDate.getTime()) / 86_400_000) }))
    .filter((c) => c.daysSince >= 60)
    .sort((a, b) => b.totalRev - a.totalRev);

  // ── Payment punctuality ───────────────────────────────────────────────────

  const paidWithDue = paid.filter((i) => i.dueDate);
  let onTime = 0, late = 0, daysEarlySum = 0, daysLateSum = 0;
  for (const inv of paidWithDue) {
    const diff = Math.round((new Date(inv.dueDate!).getTime() - new Date(inv.updatedAt).getTime()) / 86_400_000);
    if (diff >= 0) { onTime++; daysEarlySum += diff; }
    else           { late++;  daysLateSum  += Math.abs(diff); }
  }
  const punctualityTotal = paidWithDue.length || 1;
  const onTimePct  = Math.round((onTime / punctualityTotal) * 100);
  const latePct    = Math.round((late   / punctualityTotal) * 100);
  const avgEarly   = onTime > 0 ? Math.round(daysEarlySum / onTime) : 0;
  const avgLateDays = late  > 0 ? Math.round(daysLateSum  / late)  : 0;

  // ── Forecast ─────────────────────────────────────────────────────────────

  // Pipeline: open (SENT, not yet overdue) invoices expected to come in
  const pipeline = invoices.filter((i) => i.status === "SENT" && (!i.dueDate || new Date(i.dueDate) >= now));
  const pipelineTotal = pipeline.reduce((s, i) => s + effectiveTotal(i), 0);

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
  }

  // Top client
  if (topClients.length > 0) {
    const top = topClients[0];
    const pct = totalBilled > 0 ? (top.total / totalBilled) * 100 : 0;
    if (pct >= 50) {
      insights.push({ icon: "🎯", text: `${top.name} reprezintă ${pct.toFixed(0)}% din venituri — risc de concentrare`, color: "amber" });
    }
  }

  // DSO insight
  if (dso !== null) {
    if (dso >= 45) {
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

      {/* ── Client payment behavior ── */}
      {clientPayRows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Comportament de plată per client</h2>
            <span className="text-xs text-slate-400">timp mediu de încasare (zile)</span>
          </div>
          <div className="divide-y divide-slate-50">
            {clientPayRows.map((c, i) => {
              const pct = (c.avgDso / maxDso) * 100;
              const color = c.avgDso <= 14 ? "bg-green-400" : c.avgDso <= 30 ? "bg-blue-400" : c.avgDso <= 60 ? "bg-amber-400" : "bg-red-400";
              const badge = c.avgDso <= 14 ? { label: "Rapid", cls: "bg-green-50 text-green-700" }
                          : c.avgDso <= 30 ? { label: "Normal", cls: "bg-blue-50 text-blue-700" }
                          : c.avgDso <= 60 ? { label: "Lent", cls: "bg-amber-50 text-amber-700" }
                          : { label: "Problematic", cls: "bg-red-50 text-red-600" };
              return (
                <div key={i} className="px-6 py-3">
                  <div className="flex items-center gap-4 mb-1.5">
                    <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}.</span>
                    <span className="text-sm font-medium text-slate-700 flex-1 truncate">{c.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums w-20 text-right">{c.avgDso} zile</span>
                    <span className="text-xs text-slate-400 w-12 text-right shrink-0">{c.count} fact.</span>
                  </div>
                  <div className="ml-7 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Distribuție valori facturi + Starea facturilor ── */}
      {billed.length > 0 && (
        <div className="grid grid-cols-2 gap-6">

          {/* Invoice size distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-5">Distribuție valori facturi</h2>
            <div className="space-y-4">
              {sizeBuckets.map((b, i) => {
                const pct = (b.count / sizeTotal) * 100;
                const colors = ["bg-slate-300", "bg-blue-400", "bg-blue-600", "bg-violet-600"];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-600 font-medium">{b.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{b.count} fact.</span>
                        <span className="text-xs font-semibold text-slate-700 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i]} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Funnel / Starea facturilor */}
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
      )}

      {/* ── Servicii facturate + Top clienți ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* Services */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Package size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Servicii facturate</h2>
            <span className="text-xs text-slate-400 ml-auto">RON, emise + plătite</span>
          </div>
          {topServices.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Fără servicii înregistrate</p>
          ) : (
            <div className="space-y-3">
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
          )}
        </div>

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
                        <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(c.total, "RON")}</span>
                        <span className="text-xs text-slate-400 ml-1.5">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Revenue chart ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Venituri încasate</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ultimele 12 luni (RON)</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(collectedThisMonth, "RON")}</div>
            <div className="text-xs text-slate-400">luna curentă</div>
          </div>
        </div>
        <RevenueChart data={chartData} currency="RON" />
      </div>

      {/* ── Year-over-year — HIDDEN ── */}
      {false && (thisYearRev > 0 || lastYearRev > 0) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{lastYear}</p>
            <p className="text-2xl font-bold text-slate-700 tabular-nums">{formatCurrency(Math.round(lastYearRev), "RON")}</p>
            <p className="text-xs text-slate-400 mt-1">{lastYearInvoices} facturi emise</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-100 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{thisYear}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(Math.round(thisYearRev), "RON")}</p>
            <p className="text-xs text-slate-400 mt-1">{thisYearInvoices} facturi emise</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Creștere an/an</p>
            {yoyPct === null ? (
              <p className="text-sm text-slate-400">Date insuficiente</p>
            ) : (() => { const pct = yoyPct!; return (
              <p className={`text-3xl font-bold tabular-nums ${pct > 0 ? "text-green-600" : pct < 0 ? "text-red-500" : "text-slate-400"}`}>
                {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
              </p>
            ); })()}
          </div>
        </div>
      )}

      {/* ── Currency breakdown ── */}
      {currencyRows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-5">Structură pe monede</h2>
          <div className="grid grid-cols-3 gap-6">
            {currencyRows.map((r) => {
              const pct = (r.totalRon / currencyMax) * 100;
              return (
                <div key={r.cur}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700 w-10">{r.cur}</span>
                      <span className="text-xs text-slate-400">{r.count} facturi</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(Math.round(r.totalRon), "RON")}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Overdue invoice details ── */}
      {overdueDetails.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-50 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            <h2 className="text-sm font-semibold text-slate-800">Facturi restante — detaliu</h2>
            <span className="ml-auto text-xs text-slate-400">{overdueDetails.length} {overdueDetails.length === 1 ? "factură" : "facturi"} neîncasate</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-red-50/50 border-b border-red-50">
              <tr className="text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-6 py-3 text-left font-semibold">Factură</th>
                <th className="px-6 py-3 text-left font-semibold">Client</th>
                <th className="px-6 py-3 text-right font-semibold">Scadent</th>
                <th className="px-6 py-3 text-right font-semibold">Zile restante</th>
                <th className="px-6 py-3 text-right font-semibold">Valoare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {overdueDetails.map((inv) => (
                <tr key={inv.id} className="hover:bg-red-50/30">
                  <td className="px-6 py-3 font-semibold text-blue-600">
                    <a href={`/invoices/${inv.id}`} className="hover:underline">{inv.number}</a>
                  </td>
                  <td className="px-6 py-3 text-slate-700">{inv.client}</td>
                  <td className="px-6 py-3 text-right text-slate-500">
                    {new Date(inv.dueDate).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={`font-semibold tabular-nums ${inv.daysOver > 60 ? "text-red-600" : inv.daysOver > 30 ? "text-orange-500" : "text-amber-500"}`}>
                      {inv.daysOver} zile
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900 tabular-nums">
                    {formatCurrency(Math.round(inv.amount), "RON")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Run rate ── */}
      {last3Avg > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Run rate anual</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(runRate, "RON")}</p>
            <p className="text-xs text-slate-400 mt-1">bazat pe ultimele 3 luni × 12</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Ultimul trimestru</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(quarterlyRate, "RON")}</p>
            <p className="text-xs text-slate-400 mt-1">3 luni complete</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Medie lunară</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(Math.round(last3Avg), "RON")}</p>
            <p className="text-xs text-slate-400 mt-1">ultimele 3 luni</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cea mai bună lună</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {bestMonthEntry ? formatCurrency(Math.round(bestMonthEntry[1]), "RON") : "—"}
            </p>
            <p className="text-xs text-slate-400 mt-1">{bestMonthLabel ?? "—"}</p>
          </div>
        </div>
      )}

      {/* ── At-risk clients + Payment punctuality ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* At-risk clients */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={15} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-800">Clienți inactivi</h2>
            <span className="text-xs text-slate-400 ml-auto">fără factură în 60+ zile</span>
          </div>
          {atRiskClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle2 size={24} className="text-green-400" />
              <p className="text-sm text-slate-500">Toți clienții sunt activi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atRiskClients.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">ultimă factură acum {c.daysSince} zile</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(Math.round(c.totalRev), "RON")}</p>
                    <p className={`text-xs font-medium ${c.daysSince >= 180 ? "text-red-500" : c.daysSince >= 90 ? "text-orange-500" : "text-amber-500"}`}>
                      {c.daysSince >= 180 ? "Pierdut?" : c.daysSince >= 90 ? "Risc mare" : "Urmărire"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment punctuality */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-5">Punctualitate plăți</h2>
          {paidWithDue.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Date insuficiente (facturi fără termen de plată)</p>
          ) : (
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex-1 bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600 tabular-nums">{onTimePct}%</p>
                  <p className="text-xs text-green-700 font-medium mt-1">La timp</p>
                  <p className="text-xs text-slate-400 mt-0.5">{onTime} facturi</p>
                </div>
                <div className="flex-1 bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-red-500 tabular-nums">{latePct}%</p>
                  <p className="text-xs text-red-600 font-medium mt-1">Cu întârziere</p>
                  <p className="text-xs text-slate-400 mt-0.5">{late} facturi</p>
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-green-400 rounded-l-full transition-all" style={{ width: `${onTimePct}%` }} />
                <div className="h-full bg-red-400 rounded-r-full transition-all" style={{ width: `${latePct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {onTime > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Plătite în avans (mediu)</p>
                    <p className="font-semibold text-green-600">{avgEarly} zile înainte</p>
                  </div>
                )}
                {late > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Întârziere medie</p>
                    <p className="font-semibold text-red-500">{avgLateDays} zile după</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 text-center">din {paidWithDue.length} facturi cu termen de plată setat</p>
            </div>
          )}
        </div>
      </div>

      {/* ── New vs returning clients + Revenue heatmap ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* New vs returning clients */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Clienți noi vs. recurenți</h2>
            <span className="text-xs text-slate-400 ml-auto">ultimele 6 luni</span>
          </div>
          {clientAcqRows.every((r) => r.total === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">Fără date</p>
          ) : (
            <div className="space-y-3">
              {clientAcqRows.map((row) => (
                <div key={row.mk}>
                  <div className="flex items-center justify-between mb-1 text-xs text-slate-500">
                    <span className={row.isCurrent ? "font-semibold text-blue-600" : ""}>{row.label}</span>
                    <span>
                      {row.newClients > 0 && <span className="text-green-600 font-medium">{row.newClients} noi</span>}
                      {row.newClients > 0 && row.returningClients > 0 && <span className="text-slate-300 mx-1">·</span>}
                      {row.returningClients > 0 && <span className="text-blue-500">{row.returningClients} recurenți</span>}
                      {row.total === 0 && <span className="text-slate-300">—</span>}
                    </span>
                  </div>
                  {row.total > 0 && (
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-green-400 rounded-l-full"
                        style={{ width: `${(row.newClients / maxAcqTotal) * 100}%` }}
                      />
                      <div
                        className="h-full bg-blue-400"
                        style={{ width: `${(row.returningClients / maxAcqTotal) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-4 pt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />Clienți noi</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />Recurenți</span>
              </div>
            </div>
          )}
        </div>

        {/* Revenue heatmap */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-5">Heatmap venituri (all-time)</h2>
          {heatYears.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Fără date</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-slate-400 font-medium pb-2 pr-2 w-10">An</th>
                    {RO_MONTHS.map((m) => (
                      <th key={m} className="text-center text-slate-400 font-medium pb-2 px-0.5">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {heatYears.map((year) => (
                    <tr key={year}>
                      <td className="text-slate-500 font-semibold pr-2 py-0.5">{year}</td>
                      {Array.from({ length: 12 }, (_, m) => {
                        const val = heatData[year][m] ?? 0;
                        const intensity = val > 0 ? Math.max(0.08, val / heatMax) : 0;
                        const isNow = year === now.getFullYear() && m === now.getMonth();
                        return (
                          <td key={m} className="px-0.5 py-0.5">
                            <div
                              title={val > 0 ? formatCurrency(Math.round(val), "RON") : "—"}
                              className={`w-full aspect-square rounded-sm cursor-default ${isNow ? "ring-1 ring-blue-400" : ""}`}
                              style={{
                                minWidth: 20,
                                background: val > 0 ? `rgba(59,130,246,${intensity})` : "#f1f5f9",
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                <span>Mic</span>
                {[0.08, 0.25, 0.5, 0.75, 1].map((v) => (
                  <div key={v} className="w-4 h-4 rounded-sm" style={{ background: `rgba(59,130,246,${v})` }} />
                ))}
                <span>Mare</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Avg invoice value trend + Pareto concentration ── */}
      {billed.length > 0 && (
        <div className="grid grid-cols-2 gap-6">

          {/* Avg invoice value trend */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Valoare medie factură</h2>
            <p className="text-xs text-slate-400 mb-5">Evoluție lunară (RON, facturi plătite)</p>
            {avgValueByMonth.every((r) => r.avg === 0) ? (
              <p className="text-sm text-slate-400 py-4 text-center">Fără date</p>
            ) : (() => {
              const maxAvg = Math.max(...avgValueByMonth.map((r) => r.avg), 1);
              return (
                <div className="space-y-2">
                  {avgValueByMonth.filter((r) => r.avg > 0 || r.isCurrent).map((r, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`text-xs w-8 shrink-0 ${r.isCurrent ? "text-blue-600 font-semibold" : "text-slate-400"}`}>
                        {r.month}
                      </span>
                      <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                        {r.avg > 0 && (
                          <div
                            className={`h-full rounded transition-all flex items-center justify-end pr-2 ${r.isCurrent ? "bg-blue-500" : "bg-slate-300"}`}
                            style={{ width: `${(r.avg / maxAvg) * 100}%` }}
                          >
                            <span className="text-xs text-white font-medium tabular-nums whitespace-nowrap">
                              {formatCurrency(r.avg, "RON")}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{r.count > 0 ? r.count : ""}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Pareto concentration */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Concentrare venituri (Pareto)</h2>
            <p className="text-xs text-slate-400 mb-4">
              {paretoRows.length > 0
                ? `Top ${top80Count} din ${paretoRows.length} clienți → 80% din venituri`
                : "Fără date"}
            </p>
            {paretoRows.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Fără date</p>
            ) : (
              <div className="space-y-2">
                {paretoRows.slice(0, 10).map((r) => {
                  const is80 = r.rank === top80Count;
                  return (
                    <div key={r.rank}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-slate-400 w-4 shrink-0">{r.rank}.</span>
                        <span className="text-xs font-medium text-slate-700 flex-1 truncate">{r.name}</span>
                        <span className="text-xs text-slate-500 tabular-nums">{r.ownPct.toFixed(1)}%</span>
                        <span className={`text-xs font-semibold tabular-nums w-12 text-right ${r.cumulativePct >= 80 ? "text-slate-400" : "text-blue-600"}`}>
                          {r.cumulativePct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-6">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${r.cumulativePct > 80 ? "bg-slate-300" : "bg-blue-500"}`}
                            style={{ width: `${r.cumulativePct}%` }}
                          />
                        </div>
                      </div>
                      {is80 && paretoRows.length > top80Count && (
                        <div className="ml-6 mt-1 mb-1 border-t border-dashed border-amber-300 text-xs text-amber-600 pt-1">
                          ↑ 80% din venituri
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Monthly breakdown table ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Detaliu lunar — ultimele 12 luni</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-6 py-3 text-left font-semibold">Lună</th>
              <th className="px-6 py-3 text-right font-semibold">Facturi emise</th>
              <th className="px-6 py-3 text-right font-semibold">Facturi plătite</th>
              <th className="px-6 py-3 text-right font-semibold">Încasat (RON)</th>
              <th className="px-6 py-3 text-right font-semibold">Val. medie factură</th>
              <th className="px-6 py-3 text-right font-semibold">vs. luna anterioară</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {monthlyRows.map((row) => (
              <tr
                key={row.mk}
                className={row.isCurrent ? "bg-blue-50/50" : "hover:bg-slate-50/50"}
              >
                <td className="px-6 py-3 font-medium text-slate-700">
                  {row.label}
                  {row.isCurrent && <span className="ml-2 text-xs text-blue-500 font-normal">curentă</span>}
                </td>
                <td className="px-6 py-3 text-right text-slate-500 tabular-nums">
                  {row.issued > 0 ? row.issued : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-6 py-3 text-right text-slate-500 tabular-nums">
                  {row.paidCount > 0 ? row.paidCount : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-6 py-3 text-right font-semibold text-slate-900 tabular-nums">
                  {row.revenue > 0 ? formatCurrency(row.revenue, "RON") : <span className="font-normal text-slate-300">—</span>}
                </td>
                <td className="px-6 py-3 text-right text-slate-500 tabular-nums">
                  {row.avgInvoice > 0 ? formatCurrency(row.avgInvoice, "RON") : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-6 py-3 text-right tabular-nums">
                  {row.mom === null ? (
                    <span className="text-slate-300">—</span>
                  ) : row.mom > 3 ? (
                    <span className="text-green-600 font-medium">+{row.mom.toFixed(0)}%</span>
                  ) : row.mom < -3 ? (
                    <span className="text-red-500 font-medium">{row.mom.toFixed(0)}%</span>
                  ) : (
                    <span className="text-slate-400">~0%</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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