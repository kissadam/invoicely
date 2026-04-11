"use client";

import { useEffect, useState } from "react";
import { CreditCard, Zap, Loader2 } from "lucide-react";

interface UsageStat {
  current: number;
  limit: number | null;
}

interface BillingData {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  usage: {
    companies: UsageStat;
    invoicesPerMonth: UsageStat;
  };
  limits: {
    priceEur: number;
  };
}

export default function BillingSection() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/usage")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
        <Loader2 size={14} className="animate-spin" />
        Se încarcă...
      </div>
    );
  }

  if (!data) return null;

  const isPro = data.plan === "pro";

  return (
    <div className="space-y-5">
      {/* Plan badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isPro
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}>
            {isPro ? "Pro" : "Free"}
          </div>
          {isPro && data.currentPeriodEnd && (
            <span className="text-xs text-slate-400">
              Reînnoire {new Date(data.currentPeriodEnd).toLocaleDateString("ro-RO")}
            </span>
          )}
        </div>
        {isPro && (
          <button
            onClick={() => fetch("/api/billing/portal", { method: "POST" })}
            className="text-xs text-slate-500 hover:text-slate-700 underline transition-colors"
          >
            Gestionează abonamentul
          </button>
        )}
      </div>

      {/* Usage bars */}
      <div className="space-y-3">
        <UsageBar
          label="Companii"
          current={data.usage.companies.current}
          limit={data.usage.companies.limit}
        />
        <UsageBar
          label="Facturi luna aceasta"
          current={data.usage.invoicesPerMonth.current}
          limit={data.usage.invoicesPerMonth.limit}
        />
      </div>

      {/* Upgrade CTA */}
      {!isPro && (
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
          <div className="flex items-start gap-3">
            <Zap size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Upgrade la Pro — €10/lună</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Companii nelimitate, facturi nelimitate pe lună.
              </p>
            </div>
          </div>
          <button
            disabled
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg opacity-60 cursor-not-allowed"
            title="Coming soon"
          >
            <CreditCard size={14} />
            Upgrade — în curând
          </button>
        </div>
      )}
    </div>
  );
}

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number | null }) {
  const pct = limit ? Math.min((current / limit) * 100, 100) : 0;
  const nearLimit = limit ? pct >= 80 : false;
  const atLimit = limit ? current >= limit : false;

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className={atLimit ? "text-red-500 font-medium" : nearLimit ? "text-amber-500 font-medium" : ""}>
          {current} / {limit === null ? "∞" : limit}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              atLimit ? "bg-red-500" : nearLimit ? "bg-amber-400" : "bg-blue-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}