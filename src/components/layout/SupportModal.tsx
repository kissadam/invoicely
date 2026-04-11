"use client";

import { useState } from "react";
import { X, Loader2, MessageCircleQuestion, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TYPE_KEYS = ["issue", "feedback", "question", "other"] as const;

export default function SupportModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [type, setType]               = useState("question");
  const [subject, setSubject]         = useState("");
  const [description, setDescription] = useState("");
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [phone, setPhone]             = useState("");
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);
  const [error, setError]             = useState("");

  const TYPE_LABELS: Record<string, string> = {
    issue: t.support.typeIssue, feedback: t.support.typeFeedback,
    question: t.support.typeQuestion, other: t.support.typeOther,
  };

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
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Error");
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
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
            <h2 className="text-sm font-semibold text-slate-800">{t.support.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 size={40} className="text-green-500" />
            <p className="text-sm font-semibold text-slate-800">{t.support.sentTitle}</p>
            <p className="text-sm text-slate-500">{t.support.sentSubtext}</p>
            <button onClick={onClose} className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              {t.support.closeButton}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{t.support.typeLabel}</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={sel}>
                {TYPE_KEYS.map((k) => (
                  <option key={k} value={k}>{TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{t.support.subjectLabel}</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder={t.support.subjectPlaceholder} className={inp} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{t.support.descLabel}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} placeholder={t.support.descPlaceholder} className={`${inp} resize-none`} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">{t.support.nameLabel}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t.support.namePlaceholder} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">{t.support.phoneLabel}</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder={t.support.phonePlaceholder} className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{t.support.emailLabel}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder={t.support.emailPlaceholder} className={inp} />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {sending && <Loader2 size={14} className="animate-spin" />}
              {t.support.sendButton}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const sel = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";