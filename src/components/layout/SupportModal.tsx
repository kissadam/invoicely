"use client";

import { useState } from "react";
import { X, Loader2, MessageCircleQuestion, CheckCircle2 } from "lucide-react";

const TYPES = [
  { value: "issue",    label: "Problemă tehnică" },
  { value: "feedback", label: "Feedback" },
  { value: "question", label: "Întrebare" },
  { value: "other",    label: "Altele" },
];

export default function SupportModal({ onClose }: { onClose: () => void }) {
  const [type, setType]               = useState("question");
  const [subject, setSubject]         = useState("");
  const [description, setDescription] = useState("");
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [phone, setPhone]             = useState("");
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);
  const [error, setError]             = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, subject, description, name, email, phone }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Eroare la trimitere");
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion size={17} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-800">Support & Feedback</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 size={40} className="text-green-500" />
            <p className="text-sm font-semibold text-slate-800">Mesaj trimis!</p>
            <p className="text-sm text-slate-500">Îți vom răspunde cât mai curând posibil.</p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Închide
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Tip solicitare</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={sel}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Subiect <span className="text-red-400">*</span></label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Ex: Nu pot genera PDF-ul" className={inp} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Descriere <span className="text-red-400">*</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} placeholder="Descrie problema sau feedback-ul tău..." className={`${inp} resize-none`} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nume <span className="text-red-400">*</span></label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Numele tău" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Telefon <span className="text-red-400">*</span></label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="Ex: 07xx xxx xxx" className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email <span className="text-red-400">*</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="adresa@ta.ro" className={inp} />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {sending && <Loader2 size={14} className="animate-spin" />}
              Trimite
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const sel = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";