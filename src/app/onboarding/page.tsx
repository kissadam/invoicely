"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    cui: "",
    address: "",
    bank: "",
    iban: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Eroare la salvare.");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch {
      setError("Eroare de rețea. Încearcă din nou.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Building2 size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Configurează-ți compania</h1>
          <p className="text-sm text-slate-500 mt-1">
            Aceste date vor apărea pe facturile tale. Le poți modifica oricând.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Denumire companie <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex: SC Firma SRL"
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                CUI <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.cui}
                onChange={(e) => set("cui", e.target.value)}
                placeholder="Ex: RO12345678"
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Bancă</label>
              <input
                type="text"
                value={form.bank}
                onChange={(e) => set("bank", e.target.value)}
                placeholder="Ex: BCR, ING"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Adresă</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Str. Exemplu nr. 1, București"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">IBAN</label>
              <input
                type="text"
                value={form.iban}
                onChange={(e) => set("iban", e.target.value)}
                placeholder="RO49AAAA1B31007593840000"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            Continuă
          </button>
        </form>
      </div>
    </div>
  );
}