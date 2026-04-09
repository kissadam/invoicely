"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FileDown, Copy, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";

interface Invoice {
  id: string;
  number: string;
  issueDate: Date;
  totalEur: unknown;
  totalRon: unknown;
  status: string;
  client: { name: string; cui: string | null };
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

export default function InvoicesTable({ initial }: { initial: Invoice[] }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initial);

  async function deleteInvoice(id: string, number: string) {
    if (!confirm(`Ștergeți factura ${number}?`)) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Eroare la ștergere");
      return;
    }
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    toast.success(`Factura ${number} a fost ștearsă`);
    router.refresh();
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 dark:bg-slate-750 border-b border-slate-200 dark:border-slate-700">
        <tr className="text-xs text-slate-500 uppercase tracking-wide">
          <th className="px-6 py-3 text-left font-semibold">Număr</th>
          <th className="px-6 py-3 text-left font-semibold">Client</th>
          <th className="px-6 py-3 text-left font-semibold">Emitere</th>
          <th className="px-6 py-3 text-right font-semibold">EUR</th>
          <th className="px-6 py-3 text-right font-semibold">RON</th>
          <th className="px-6 py-3 text-center font-semibold">Status</th>
          <th className="px-6 py-3 text-center font-semibold w-28">Acțiuni</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
        {invoices.map((inv) => (
          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
            <td className="px-6 py-4">
              <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline font-semibold">
                {inv.number}
              </Link>
            </td>
            <td className="px-6 py-4">
              <div className="font-medium text-slate-800 dark:text-slate-200">{inv.client.name}</div>
              {inv.client.cui && <div className="text-xs text-slate-400">{inv.client.cui}</div>}
            </td>
            <td className="px-6 py-4 text-slate-500">
              {new Date(inv.issueDate).toLocaleDateString("ro-RO")}
            </td>
            <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
              {formatCurrency(Number(inv.totalEur), "EUR")}
            </td>
            <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">
              {formatCurrency(Number(inv.totalRon), "RON")}
            </td>
            <td className="px-6 py-4 text-center">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                {STATUS_LABELS[inv.status]}
              </span>
            </td>
            <td className="px-6 py-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <a
                  href={`/api/invoices/${inv.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Descarcă PDF"
                >
                  <FileDown size={15} />
                </a>
                <Link
                  href={`/invoices/new?duplicate=${inv.id}`}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Duplică"
                >
                  <Copy size={15} />
                </Link>
                <button
                  onClick={() => deleteInvoice(inv.id, inv.number)}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 transition-colors"
                  title="Șterge"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}