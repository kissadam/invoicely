"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Search, Loader2, X } from "lucide-react";

export default function AddClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cuiInput, setCuiInput] = useState("");
  const [cuiLoading, setCuiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", cui: "", address: "", vatPayer: false, phone: "", email: "", currency: "RON",
  });

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function lookupCUI() {
    if (!cuiInput.trim()) return;
    setCuiLoading(true);
    try {
      const res = await fetch(`/api/company/${cuiInput.trim()}`);
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Firma nu a fost găsită"); return; }
      const d = json.data;
      const cui = d.cui && d.cui !== "undefined" ? d.cui : cuiInput.trim();
      setForm((f) => ({ ...f, name: d.name, cui, address: d.address, vatPayer: d.vatPayer }));
      toast.success(`Firma găsită: ${d.name}`);
    } catch {
      toast.error("Eroare la căutarea CUI");
    } finally {
      setCuiLoading(false);
    }
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Numele este obligatoriu"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Eroare la salvare");
      }
      toast.success(`Clientul ${form.name} a fost adăugat`);
      setOpen(false);
      setForm({ name: "", cui: "", address: "", vatPayer: false, phone: "", email: "", currency: "RON" });
      setCuiInput("");
      router.refresh();
    } catch {
      toast.error("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Plus size={16} /> Client nou
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Adaugă client</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* CUI lookup */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">CUI (opțional — autofill din ANAF)</label>
            <div className="flex gap-2">
              <input
                value={cuiInput}
                onChange={(e) => setCuiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupCUI()}
                placeholder="ex. RO12345678"
                className={input}
              />
              <button
                onClick={lookupCUI}
                disabled={cuiLoading}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {cuiLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Caută
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Nume *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className={input} placeholder="Firma SRL" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">CUI</label>
              <input value={form.cui} onChange={(e) => set("cui", e.target.value)} className={input} placeholder="RO12345678" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Adresă</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className={input} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Telefon</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Email</label>
              <input value={form.email} onChange={(e) => set("email", e.target.value)} className={input} type="email" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.vatPayer}
                onChange={(e) => set("vatPayer", e.target.checked)}
                className="rounded"
              />
              Plătitor TVA
            </label>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Monedă facturare</label>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={input}>
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            Anulează
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Salvează
          </button>
        </div>
      </div>
    </div>
  );
}

const input = "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";