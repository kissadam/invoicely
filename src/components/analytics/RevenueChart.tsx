"use client";

import { useState } from "react";

interface MonthBar {
  month: string;   // "Ian", "Feb", ...
  value: number;
  isCurrent: boolean;
}

interface Props {
  data: MonthBar[];
  currency?: string;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

export default function RevenueChart({ data, currency = "RON" }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5 h-44 w-full relative">
        {data.map((bar, i) => {
          const pct = (bar.value / max) * 100;
          const isHovered = hovered === i;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group cursor-default relative"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHovered && bar.value > 0 && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap z-10 shadow-lg">
                  <div className="font-semibold">{bar.month}</div>
                  <div className="tabular-nums">{bar.value.toLocaleString("ro-RO", { minimumFractionDigits: 0 })} {currency}</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              )}
              {/* Bar */}
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md transition-all duration-150"
                  style={{
                    height: pct > 0 ? `${Math.max(pct, 2)}%` : "2px",
                    background: bar.isCurrent
                      ? "linear-gradient(180deg, #3b82f6, #1d4ed8)"
                      : isHovered
                      ? "linear-gradient(180deg, #60a5fa, #3b82f6)"
                      : "linear-gradient(180deg, #bfdbfe, #93c5fd)",
                    opacity: bar.value === 0 ? 0.3 : 1,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* X axis labels */}
      <div className="flex gap-1.5 mt-2">
        {data.map((bar, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-xs truncate ${
              bar.isCurrent ? "text-blue-600 font-semibold" : "text-slate-400"
            }`}
          >
            {bar.month}
          </div>
        ))}
      </div>
      {/* Y axis hint */}
      <div className="flex justify-between text-xs text-slate-300 mt-1 px-0">
        <span>0</span>
        <span>{fmt(max)} {currency}</span>
      </div>
    </div>
  );
}