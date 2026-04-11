"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AcceptTermsClient() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    if (!checked) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/accept-terms", { method: "POST" });
      if (!res.ok) throw new Error();
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Before you continue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Please review and accept our Terms & Privacy Policy to use Invoicely.
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6 space-y-3 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <FileText size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <span>Invoicely is a software tool to help you generate invoices. You remain responsible for fiscal and legal compliance.</span>
          </div>
          <div className="flex items-start gap-2">
            <FileText size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <span>We collect your email, company data, and invoices solely to provide the service.</span>
          </div>
          <div className="flex items-start gap-2">
            <FileText size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <span>Invoice data is retained for 10 years per Romanian fiscal law.</span>
          </div>
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer group">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
            I have read and agree to the{" "}
            <Link href="/terms-and-conditions" target="_blank" className="text-blue-600 hover:underline font-medium">
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline font-medium">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          onClick={accept}
          disabled={!checked || loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
          Accept & Continue
        </button>
      </div>
    </div>
  );
}