"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { Company } from "@prisma/client";

interface Props {
  existing: Company | null;
}

export default function CompanyForm({ existing }: Props) {
  const [savedId, setSavedId] = useState<string | null>(existing?.id ?? null);
  const [form, setForm] = useState({
    cui:      existing?.cui                              ?? "",
    name:     existing?.name                             ?? "",
    address:  existing?.address                          ?? "",
    bank:     existing?.bank                             ?? "",
    iban:     existing?.iban                             ?? "",
    phone:    existing?.phone                            ?? "",
    email:    existing?.email                            ?? "",
    vatPayer: existing?.vatPayer                         ?? false,
    vatRate:  existing?.vatRate != null ? String(existing.vatRate) : "",
  });
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof form, val: string | boolean) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    if (!form.cui || !form.name) {
      toast.error("CUI și Denumire sunt obligatorii");
      return;
    }
    setSaving(true);
    try {
      const method = savedId ? "PATCH" : "POST";
      const url = savedId ? `/api/companies/${savedId}` : "/api/companies";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Eroare la salvare");
      const data = await res.json();
      if (!savedId) setSavedId(data.id);
      toast.success("Compania a fost salvată");
    } catch {
      toast.error("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="CUI *">
          <input value={form.cui} onChange={(e) => set("cui", e.target.value)} className={input} placeholder="RO12345678" />
        </Field>
        <Field label="Denumire *">
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={input} placeholder="Compania Mea SRL" />
        </Field>
      </div>
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
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.vatRate}
              onChange={(e) => set("vatRate", e.target.value)}
              className={input}
              placeholder="21"
            />
          </Field>
        )}
      </div>
      <div className="flex justify-end pt-2">
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