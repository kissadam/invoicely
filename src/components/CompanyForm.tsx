"use client";

import { useState } from "react";
import { Search, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { Company } from "@prisma/client";

interface Props {
  existing: Company | null;
}

const EMPTY = {
  cui: "", name: "", address: "", bank: "", iban: "",
  phone: "", email: "", vatPayer: false, vatRate: "",
};

export default function CompanyForm({ existing }: Props) {
  const [savedId, setSavedId] = useState<string | null>(existing?.id ?? null);
  const [form, setForm] = useState({
    cui:      existing?.cui      ?? "",
    name:     existing?.name     ?? "",
    address:  existing?.address  ?? "",
    bank:     existing?.bank     ?? "",
    iban:     existing?.iban     ?? "",
    phone:    existing?.phone    ?? "",
    email:    existing?.email    ?? "",
    vatPayer: existing?.vatPayer ?? false,
    vatRate:  existing?.vatRate != null ? String(existing.vatRate) : "",
  });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cuiLoading, setCuiLoading] = useState(false);

  function set(key: keyof typeof form, val: string | boolean) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function lookupCui() {
    const cui = form.cui.trim().replace(/\D/g, "");
    if (!cui) return;
    setCuiLoading(true);
    try {
      const res = await fetch(`/api/anaf?cui=${cui}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nu s-au găsit date pentru acest CUI");
      setForm((f) => ({
        ...f,
        name:     data.name     ?? f.name,
        address:  data.address  ?? f.address,
        vatPayer: data.vatPayer ?? f.vatPayer,
      }));
      toast.success("Date preluate din ANAF");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Eroare la căutare CUI");
    } finally {
      setCuiLoading(false);
    }
  }

  async function save() {
    const trimmed = { ...form, cui: form.cui.trim(), name: form.name.trim() };
    if (!trimmed.cui || !trimmed.name) {
      toast.error("CUI și Denumire sunt obligatorii");
      return;
    }
    setSaving(true);
    try {
      const method = savedId ? "PATCH" : "POST";
      const url    = savedId ? `/api/companies/${savedId}` : "/api/companies";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trimmed),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* empty body */ }
      if (!res.ok) throw new Error((data.error as string) ?? `Eroare la salvare (${res.status})`);
      if (!savedId) setSavedId(data.id as string);
      toast.success("Compania a fost salvată");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Eroare la salvare");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCompany() {
    if (!savedId) { setForm(EMPTY); return; }
    if (!confirm("Ștergi compania? Facturile existente nu vor fi afectate.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/companies/${savedId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Eroare la ștergere");
      }
      setSavedId(null);
      setForm(EMPTY);
      toast.success("Compania a fost ștearsă");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Eroare la ștergere");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      {/* CUI with ANAF autofill */}
      <div>
        <label className="block text-xs text-slate-500 mb-1.5 font-medium">CUI *</label>
        <div className="flex gap-2">
          <input
            value={form.cui}
            onChange={(e) => set("cui", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookupCui())}
            className={input + " flex-1"}
            placeholder="RO12345678"
          />
          <button
            type="button"
            onClick={lookupCui}
            disabled={cuiLoading || !form.cui.trim()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {cuiLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            ANAF
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">Introdu CUI-ul și apasă ANAF pentru a prelua datele automat.</p>
      </div>

      <Field label="Denumire *">
        <input value={form.name} onChange={(e) => set("name", e.target.value)} className={input} placeholder="Compania Mea SRL" />
      </Field>
      <Field label="Adresă">
        <input value={form.address} onChange={(e) => set("address", e.target.value)} className={input} placeholder="Str. Exemplu nr. 1, București" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Bancă">
          <input value={form.bank} onChange={(e) => set("bank", e.target.value)} className={input} placeholder="BCR" />
        </Field>
        <Field label="IBAN">
          <input value={form.iban} onChange={(e) => set("iban", e.target.value)} className={input} placeholder="RO49AAAA..." />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Telefon">
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={input} />
        </Field>
        <Field label="Email">
          <input value={form.email} onChange={(e) => set("email", e.target.value)} className={input} type="email" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 pt-1">
          <input
            id="vatPayer"
            type="checkbox"
            checked={!!form.vatPayer}
            onChange={(e) => setForm((f) => ({ ...f, vatPayer: e.target.checked }))}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="vatPayer" className="text-sm text-slate-700 dark:text-slate-200 font-medium select-none">
            Plătitor TVA (RO prefix)
          </label>
        </div>
        {form.vatPayer && (
          <Field label="Cotă TVA (%)">
            <input
              type="number" min={0} max={100} step={1}
              value={form.vatRate}
              onChange={(e) => set("vatRate", e.target.value)}
              className={input} placeholder="21"
            />
          </Field>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={deleteCompany}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg disabled:opacity-50 transition-colors"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {savedId ? "Șterge compania" : "Resetează"}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? "Se salvează..." : "Salvează"}
        </button>
      </div>
    </div>
  );
}

const input = "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1.5 font-medium">{label}</label>
      {children}
    </div>
  );
}