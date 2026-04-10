"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export default function MarkPaidButton({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isPaid = currentStatus === "PAID";

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isPaid ? "SENT" : "PAID" }),
      });
      if (!res.ok) throw new Error("Eroare");
      toast.success(isPaid ? "Marcată ca neîncasată" : "Marcată ca plătită");
      router.refresh();
    } catch {
      toast.error("Eroare la actualizare status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors disabled:opacity-50 ${
        isPaid
          ? "border-green-200 text-green-700 hover:bg-green-50"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isPaid ? (
        <CheckCircle2 size={14} />
      ) : (
        <Circle size={14} />
      )}
      {isPaid ? "Marcează ca neîncasată" : "Marchează plătită"}
    </button>
  );
}