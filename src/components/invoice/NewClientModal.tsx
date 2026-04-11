"use client";

import { useState } from "react";
import { X, Search, Loader2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import type { SelectedClient } from "./ClientSearch";

interface Props {
  initialName?: string;
  onClose: () => void;
  onSaved: (client: SelectedClient & { id: string }) => void;
}

export default function NewClientModal({ initialName = "", onClose, onSaved }: Props) {
  const [cuiInput, setCuiInput]   = useState("");
  const [cuiLoading, setCuiLoading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    name: initialName, cui: "", address: "", vatPayer: false, phone: "", email: "",
  });

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function lookupCUI() {
    if (!cuiInput.trim()) return;
    setCuiLoading(true);
    try {
      const res  = await fetch(`/api/company/${encodeURIComponent(cuiInput.trim())}`);
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Firma nu a fost găsită"); return; }
      const d   = json.data;
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
      const saved = await res.json();
      toast.success(`Clientul ${saved.name} a fost adăugat`);
      onSaved({
        id:       saved.id,
        name:     saved.name,
        cui:      saved.cui      ?? "",
        address:  saved.address  ?? "",
        vatPayer: saved.vatPayer ?? false,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Eroare la salvare");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Client nou</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* CUI lookup */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">CUI — autofill din ANAF</label>
            <div className="flex gap-2">
              <input
                value={cuiInput}
                onChange={(e) => setCuiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupCUI()}
                placeholder="ex. RO12345678"
                className={inp}
              />
              <button
                onClick={lookupCUI}
                disabled={cuiLoading}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1.5 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {cuiLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Caută
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Nume <span className="text-red-400">*</span></label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inp} placeholder="Firma SRL" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">CUI</label>
              <input value={form.cui} onChange={(e) => set("cui", e.target.value)} className={inp} placeholder="RO12345678" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Adresă</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inp} placeholder="Str. Exemplu nr. 1, București" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Telefon</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inp} placeholder="07xx xxx xxx" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Email</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inp} placeholder="contact@firma.ro" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.vatPayer}
              onChange={(e) => set("vatPayer", e.target.checked)}
              className="rounded"
            />
            Plătitor TVA
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Salvează client
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";