"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Pencil, Trash2, X, Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  cui: string | null;
  address: string | null;
  vatPayer: boolean;
  currency: string;
  _count: { invoices: number };
}

interface EditForm {
  name: string;
  cui: string;
  address: string;
  vatPayer: boolean;
  phone: string;
  email: string;
  currency: string;
}

export default function ClientsTable({ initial }: { initial: Client[] }) {
  const router = useRouter();
  const [clients, setClients] = useState(initial);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [form, setForm] = useState<EditForm>({ name: "", cui: "", address: "", vatPayer: false, phone: "", email: "", currency: "RON" });
  const [saving, setSaving] = useState(false);

  function openEdit(c: Client) {
    setEditTarget(c);
    setForm({ name: c.name, cui: c.cui ?? "", address: c.address ?? "", vatPayer: c.vatPayer, phone: "", email: "", currency: c.currency ?? "RON" });
  }

  function closeEdit() {
    setEditTarget(null);
  }

  function set<K extends keyof EditForm>(key: K, val: EditForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!form.name.trim()) { toast.error("Numele este obligatoriu"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setClients((prev) => prev.map((c) => c.id === editTarget.id ? { ...c, ...updated } : c));
      closeEdit();
      toast.success("Client actualizat");
    } catch {
      toast.error("Eroare la salvare");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(id: string, name: string) {
    if (!confirm(`Ștergeți clientul "${name}"?`)) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Eroare la ștergere");
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== id));
    toast.success("Client șters");
    router.refresh();
  }

  if (clients.length === 0) {
    return <div className="py-20 text-center text-slate-400 text-sm">Niciun client.</div>;
  }

  return (
    <>
      {/* Table */}
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-750 border-b border-slate-200 dark:border-slate-700">
          <tr className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
            <th className="px-5 py-3 text-left">Nume</th>
            <th className="px-5 py-3 text-left">CUI</th>
            <th className="px-5 py-3 text-left hidden md:table-cell">Adresă</th>
            <th className="px-5 py-3 text-center hidden lg:table-cell">Monedă</th>
            <th className="px-5 py-3 text-center">TVA</th>
            <th className="px-5 py-3 text-center">Facturi</th>
            <th className="px-5 py-3 text-center w-20">Acțiuni</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {clients.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
              <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[180px] truncate">{c.name}</td>
              <td className="px-5 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{c.cui ?? "—"}</td>
              <td className="px-5 py-3 text-slate-400 text-xs hidden md:table-cell max-w-[200px] truncate">{c.address ?? "—"}</td>
              <td className="px-5 py-3 text-center hidden lg:table-cell">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 font-mono">
                  {c.currency ?? "RON"}
                </span>
              </td>
              <td className="px-5 py-3 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.vatPayer ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                  {c.vatPayer ? "DA" : "NU"}
                </span>
              </td>
              <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-300 font-medium">{c._count.invoices}</td>
              <td className="px-5 py-3">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Editează"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteClient(c.id, c.name)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 transition-colors"
                    title="Șterge"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Editează client</h2>
              <button onClick={closeEdit} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nume *">
                  <input value={form.name} onChange={(e) => set("name", e.target.value)} className={input} autoFocus />
                </Field>
                <Field label="CUI">
                  <input value={form.cui} onChange={(e) => set("cui", e.target.value)} className={input} placeholder="RO12345678" />
                </Field>
              </div>
              <Field label="Adresă">
                <input value={form.address} onChange={(e) => set("address", e.target.value)} className={input} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefon">
                  <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={input} />
                </Field>
                <Field label="Email">
                  <input value={form.email} onChange={(e) => set("email", e.target.value)} className={input} type="email" />
                </Field>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.vatPayer}
                    onChange={(e) => set("vatPayer", e.target.checked)}
                    className="rounded"
                  />
                  Plătitor TVA
                </label>
                <Field label="Monedă facturare">
                  <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={input}>
                    <option value="RON">RON</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
              <button onClick={closeEdit} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                Anulează
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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