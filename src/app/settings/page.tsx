"use client";

import { useState } from "react";
import { Globe, Download, Trash2, FileText, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Locale } from "@/lib/i18n";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { t, locale, setLocale } = useLanguage();
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  function saveLanguage() {
    setLocale(selectedLocale);
    window.location.reload();
  }

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/export-data");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoicely-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      window.location.href = "/login";
    } catch {
      toast.error("Delete failed. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t.settings.title}</h1>
        <p className="text-sm text-slate-500 mt-1">{t.settings.subtitle}</p>
      </div>

      {/* ── Language ── */}
      <Section icon={<Globe size={16} className="text-blue-500" />} title={t.settings.language}>
        <p className="text-sm text-slate-500 mb-4">
          Choose the interface language. The page will reload to apply the change.
        </p>
        <div className="flex gap-3 mb-4">
          {(["en", "ro"] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => setSelectedLocale(l)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                selectedLocale === l
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {l === "en" ? "🇬🇧 English" : "🇷🇴 Română"}
              {selectedLocale === l && <CheckCircle2 size={14} className="text-blue-500" />}
            </button>
          ))}
        </div>
        <button
          onClick={saveLanguage}
          disabled={selectedLocale === locale}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
        >
          Save & Reload
        </button>
      </Section>

      {/* ── System info ── */}
      <Section icon={<FileText size={16} className="text-slate-400" />} title="System">
        <div className="space-y-2 text-sm text-slate-600">
          <p><span className="font-medium text-slate-800">{t.settings.database}:</span> PostgreSQL via Prisma</p>
          <p><span className="font-medium text-slate-800">{t.settings.anafApi}:</span> webservicesp.anaf.ro/api/PlatitorTvaRest/v8/tva</p>
          <p><span className="font-medium text-slate-800">{t.settings.bnrXml}:</span> www.bnr.ro/nbrfxrates.xml</p>
          <p><span className="font-medium text-slate-800">{t.settings.pdf}:</span> Puppeteer (Chromium headless)</p>
        </div>
      </Section>

      {/* ── Legal ── */}
      <Section icon={<Shield size={16} className="text-green-500" />} title="Legal & Privacy">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/privacy-policy"
            target="_blank"
            className="px-4 py-2 border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-and-conditions"
            target="_blank"
            className="px-4 py-2 border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Terms & Conditions
          </Link>
        </div>
      </Section>

      {/* ── Data export ── */}
      <Section icon={<Download size={16} className="text-blue-500" />} title="Export My Data">
        <p className="text-sm text-slate-500 mb-4">
          Download all your data (profile, companies, clients, invoices) as a JSON file. This is your right under GDPR Art. 20.
        </p>
        <button
          onClick={exportData}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-50 transition-colors"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? "Exporting…" : "Export JSON"}
        </button>
      </Section>

      {/* ── Delete account ── */}
      <Section icon={<Trash2 size={16} className="text-red-500" />} title="Delete Account" danger>
        <p className="text-sm text-slate-500 mb-4">
          Permanently delete your account and anonymise personal data. Invoices are retained for 10 years as required by Romanian fiscal law (Legea 82/1991). This action cannot be undone.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Type <span className="font-mono font-bold text-slate-700">DELETE</span> to confirm
            </label>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-64 px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <button
            onClick={deleteAccount}
            disabled={deleting || deleteConfirm !== "DELETE"}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? "Deleting…" : "Delete My Account"}
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon, title, children, danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-6 ${danger ? "border-red-200" : "border-slate-200"}`}>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className={`text-sm font-semibold ${danger ? "text-red-700" : "text-slate-800"}`}>{title}</h2>
      </div>
      {children}
    </div>
  );
}