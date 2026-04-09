"use client";

import { useEffect } from "react";
import { Trash2 } from "lucide-react";
import type { InvoiceItemForm } from "@/types/invoice";

interface Props {
  item: InvoiceItemForm;
  exchangeRate: number;
  currency: string;
  onChange: (updated: InvoiceItemForm) => void;
  onRemove?: () => void;
}

export default function LineItemRow({ item, exchangeRate, currency, onChange, onRemove }: Props) {
  const needsRate = currency !== "RON";
  // Recompute subtotals when qty, price, or rate change
  useEffect(() => {
    const subtotalEur = Math.round(item.quantity * item.priceEur * 100) / 100;
    const subtotalRon = Math.round(subtotalEur * exchangeRate * 100) / 100;
    if (subtotalEur !== item.subtotalEur || subtotalRon !== item.subtotalRon) {
      onChange({ ...item, subtotalEur, subtotalRon });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.quantity, item.priceEur, exchangeRate]);

  function set<K extends keyof InvoiceItemForm>(key: K, value: InvoiceItemForm[K]) {
    onChange({ ...item, [key]: value });
  }

  const gridCols = needsRate
    ? "grid-cols-[40px_1fr_80px_90px_110px_110px_110px_40px]"
    : "grid-cols-[40px_1fr_80px_90px_110px_110px_40px]";

  return (
    <div className={`grid ${gridCols} gap-2 px-4 py-2.5 border-b border-slate-50 dark:border-slate-700 items-center hover:bg-slate-50/50 dark:hover:bg-slate-750/50 transition-colors`}>
      <span className="text-center text-xs text-slate-400 font-medium">{item.position}</span>

      <input
        value={item.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Denumire serviciu..."
        className={cell}
      />

      <input
        value={item.unit}
        onChange={(e) => set("unit", e.target.value)}
        className={`${cell} text-center`}
      />

      <input
        type="number"
        min={0}
        value={item.quantity}
        onChange={(e) => set("quantity", parseFloat(e.target.value) || 0)}
        className={`${cell} text-right`}
      />

      <input
        type="number"
        min={0}
        step="0.01"
        value={item.priceEur}
        onChange={(e) => set("priceEur", parseFloat(e.target.value) || 0)}
        className={`${cell} text-right`}
      />

      <div className="text-right text-sm text-slate-700 dark:text-slate-300 font-medium pr-1">
        {item.subtotalEur.toFixed(2)}
      </div>

      {needsRate && (
        <div className="text-right text-sm text-slate-800 dark:text-slate-200 font-semibold pr-1">
          {item.subtotalRon.toFixed(2)}
        </div>
      )}

      <div className="flex justify-center">
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

const cell =
  "w-full px-2 py-1.5 text-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500 rounded-md bg-transparent focus:bg-white dark:focus:bg-slate-700 outline-none transition-colors";