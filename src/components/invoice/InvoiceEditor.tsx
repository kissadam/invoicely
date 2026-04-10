"use client";

/**
 * Main invoice creation / editing form.
 * Handles: currency selector, BNR rate fetch, VAT, line items, live totals.
 */

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, RefreshCw, FileDown, Loader2, AlertTriangle } from "lucide-react";
import { computeInvoice } from "@/lib/calculations";
import { formatExchangeRateLine } from "@/lib/bnr";
import type { InvoiceItemForm } from "@/types/invoice";
import LineItemRow from "./LineItemRow";
import InvoicePreview from "./InvoicePreview";
import ClientSearch, { type SelectedClient } from "./ClientSearch";

const EMPTY_ITEM = (): InvoiceItemForm => ({
  position: 1,
  name: "",
  unit: "buc",
  quantity: 1,
  priceEur: 0,
  subtotalEur: 0,
  subtotalRon: 0,
});

const EXAMPLE_ITEMS: Omit<InvoiceItemForm, "subtotalEur" | "subtotalRon">[] = [
  { position: 1, name: "Servicii design web",                      unit: "buc", quantity: 1,  priceEur: 400 },
  { position: 2, name: "Incarcare produse simple",                 unit: "buc", quantity: 16, priceEur: 5   },
  { position: 3, name: "Incarcare produse variabile complexe",     unit: "buc", quantity: 2,  priceEur: 20  },
  { position: 4, name: "Servicii fotografice",                     unit: "buc", quantity: 3,  priceEur: 4   },
];

type Company = {
  id: string;
  name: string;
  cui: string;
  address: string;
  bank?: string | null;
  iban?: string | null;
  vatPayer?: boolean;
  vatRate?: number | null;
};

export default function InvoiceEditor() {
  const router = useRouter();
  const [tab, setTab] = useState<"form" | "preview">("form");

  // Supplier company
  const [company, setCompany] = useState<Company | null>(null);
  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((list) => { if (list[0]) setCompany(list[0]); })
      .catch(() => {});
  }, []);

  // Client
  const [client, setClient] = useState<SelectedClient | null>(null);

  // VAT — enabled when client is VAT payer; always 21% (editable via company settings)
  const vatEnabled = !!client?.vatPayer;
  const vatRate = 21;

  // Currency — selected on the invoice, persisted in localStorage
  const [currency, setCurrency] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("invoice_currency") ?? "RON";
    return "RON";
  });
  const needsRate = currency !== "RON";

  function handleCurrencyChange(cur: string) {
    setCurrency(cur);
    if (typeof window !== "undefined") localStorage.setItem("invoice_currency", cur);
    if (cur !== "RON") fetchRate(cur);
    else { setExchangeRate(1); setRateDate(""); }
  }

  // Exchange rate
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [rateDate, setRateDate] = useState<string>("");
  const [rateLoading, setRateLoading] = useState(false);

  // Items
  const [items, setItems] = useState<InvoiceItemForm[]>([EMPTY_ITEM()]);

  // Invoice meta
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [shipDate, setShipDate] = useState("");
  const [notes, setNotes] = useState("");
  const [footerText, setFooterText] = useState(
    "Factura circulă fără semnătura și ștampila conform Lg. 227/2015-Codul fiscal art 319(aliniat 29)."
  );

  const [saving, setSaving] = useState(false);

  // Dirty tracking & exit confirmation
  const [isDirty, setIsDirty] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const hasContent = !!client || items.some((i) => i.name.trim()) || !!notes || invoiceNumber.trim() !== "";
  useEffect(() => { if (hasContent) setIsDirty(true); }, [hasContent]);

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) { if (isDirty) e.preventDefault(); }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    function handler(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      e.preventDefault();
      e.stopPropagation();
      navigate(href);
    }
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  function navigate(href: string) {
    if (isDirty) { setPendingHref(href); setShowExitModal(true); }
    else router.push(href);
  }

  function confirmExit() {
    setIsDirty(false);
    setShowExitModal(false);
    if (pendingHref) router.push(pendingHref);
  }

  // Totals — recomputed reactively
  const [totals, setTotals] = useState({ totalEur: 0, totalRon: 0, vatRate: 0, vatAmountRon: 0, totalWithVatRon: 0 });
  const [computedItems, setComputedItems] = useState<InvoiceItemForm[]>([]);

  useEffect(() => {
    if (exchangeRate > 0) {
      const { items: ci, totals: t } = computeInvoice(items, exchangeRate, vatEnabled ? vatRate : 0);
      setComputedItems(ci);
      setTotals(t);
    }
  }, [items, exchangeRate, vatEnabled, vatRate]);

  async function fetchRate(cur = currency) {
    if (cur === "RON") { setExchangeRate(1); setRateDate(""); return; }
    setRateLoading(true);
    try {
      const res = await fetch(`/api/exchange-rate?currency=${cur}`);
      if (!res.ok) throw new Error("Rate fetch failed");
      const data = await res.json();
      setExchangeRate(data.rate);
      setRateDate(data.date);
    } catch {
      toast.error("Nu s-a putut prelua cursul BNR");
    } finally {
      setRateLoading(false);
    }
  }

  function loadExamples() {
    const withTotals: InvoiceItemForm[] = EXAMPLE_ITEMS.map((item) => ({
      ...item,
      subtotalEur: item.quantity * item.priceEur,
      subtotalRon: item.quantity * item.priceEur * exchangeRate,
    }));
    setItems(withTotals);
    toast.success("Articolele exemplu au fost încărcate");
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM(), position: prev.length + 1 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, position: i + 1 })));
  }

  const updateItem = useCallback((idx: number, updated: InvoiceItemForm) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? updated : item)));
  }, []);

  async function saveInvoice() {
    if (!company) { toast.error("Adaugă datele companiei tale înainte de a genera facturi"); return; }
    if (!client) { toast.error("Selectați un client"); return; }
    if (exchangeRate <= 0) { toast.error("Cursul valutar este invalid"); return; }
    const validItems = items.filter((i) => i.name.trim() && Number(i.quantity) > 0 && Number(i.priceEur) > 0);
    if (validItems.length === 0) {
      toast.error("Adăugați cel puțin un articol cu nume, cantitate și preț");
      return;
    }

    setSaving(true);
    try {
      let clientId = client.id;
      if (!clientId) {
        const cr = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(client),
        });
        if (!cr.ok) throw new Error("Eroare salvare client");
        const saved = await cr.json();
        clientId = saved.id;
      }

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          companyId: company?.id,
          invoiceNumber: invoiceNumber.trim() || undefined,
          currency,
          issueDate,
          dueDate: dueDate || undefined,
          shipDate: shipDate || undefined,
          exchangeRate,
          vatRate: vatEnabled ? vatRate : 0,
          notes: notes || undefined,
          footerText,
          items: computedItems.filter((i) => i.name.trim() && Number(i.quantity) > 0 && Number(i.priceEur) > 0),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Eroare salvare factură");
      }

      const invoice = await res.json();
      setIsDirty(false);
      toast.success(`Factura ${invoice.number} a fost creată!`);
      router.push(`/invoices/${invoice.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setSaving(false);
    }
  }

  const exchangeLine =
    needsRate && exchangeRate > 0 && rateDate
      ? formatExchangeRateLine(exchangeRate, currency, rateDate)
      : "";

  const displayTotal = needsRate ? totals.totalRon : totals.totalEur;

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-slate-200">
        {(["form", "preview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "form" ? "Editor" : "Preview"}
          </button>
        ))}
      </div>

      {!company && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          <span>
            Nu ai adăugat datele companiei tale (Furnizor).{" "}
            <Link href="/companies" className="font-semibold underline hover:text-amber-900">Adaugă acum</Link>{" "}
            pentru a putea genera facturi.
          </span>
        </div>
      )}

      {tab === "form" ? (
        <div className="space-y-6">

          {/* Client + Currency */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Client</h2>
              <ClientSearch value={client} onChange={setClient} />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Monedă factură</h2>
              <div className="flex gap-2 mb-3">
                {["RON", "EUR", "USD"].map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => handleCurrencyChange(cur)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      currency === cur ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
              {needsRate && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-500">1 {currency} =</label>
                  <input
                    type="number"
                    value={exchangeRate || ""}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                    step="0.0001"
                    className="w-28 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">RON</span>
                  <button
                    onClick={() => fetchRate()}
                    disabled={rateLoading}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {rateLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    BNR
                  </button>
                </div>
              )}
              {exchangeLine && <p className="text-xs text-slate-500 mt-2 italic">{exchangeLine}</p>}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Date factură</h2>
            <div className="grid grid-cols-4 gap-4">
              <Field label="Număr factură">
                <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Auto (INV-2026-001)" className={inputClass} />
              </Field>
              <Field label="Data emiterii">
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Data expediției">
                <input type="date" value={shipDate} onChange={(e) => setShipDate(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Termen de plată">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
              </Field>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Articole</h2>
              <div className="flex gap-2">
                <button onClick={loadExamples} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded border border-slate-200 transition-colors">
                  Încarcă exemplu
                </button>
                <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded border border-blue-200 transition-colors">
                  <Plus size={12} /> Adaugă rând
                </button>
              </div>
            </div>

            <div
              className="grid gap-2 px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100"
              style={{ gridTemplateColumns: ["40px", "1fr", "80px", "90px", "110px", "110px", ...(needsRate ? ["110px"] : []), ...(vatEnabled ? ["90px", "110px"] : []), "40px"].join(" ") }}
            >
              <span className="text-center">Nr.</span>
              <span>Denumire serviciu</span>
              <span className="text-center">U.M.</span>
              <span className="text-right">Cantitate</span>
              <span className="text-right leading-tight">Preț<br/><span className="normal-case font-normal">{currency}</span></span>
              <span className="text-right leading-tight">Subtotal<br/><span className="normal-case font-normal">{currency}</span></span>
              {needsRate && <span className="text-right leading-tight">Subtotal<br/><span className="normal-case font-normal">RON</span></span>}
              {vatEnabled && <span className="text-right leading-tight">TVA<br/><span className="normal-case font-normal">{vatRate}%</span></span>}
              {vatEnabled && <span className="text-right leading-tight">Total<br/><span className="normal-case font-normal">TVA inclus</span></span>}
              <span />
            </div>

            {items.map((item, idx) => (
              <LineItemRow
                key={idx}
                item={item}
                exchangeRate={exchangeRate}
                currency={currency}
                vatEnabled={vatEnabled}
                vatRate={vatRate}
                onChange={(updated) => updateItem(idx, updated)}
                onRemove={items.length > 1 ? () => removeItem(idx) : undefined}
              />
            ))}

            {/* Totals */}
            <div className="flex justify-end px-4 py-4 border-t border-slate-200 bg-slate-50">
              <div className="space-y-1 text-sm min-w-[300px]">
                {needsRate && (
                  <div className="flex justify-between text-slate-600">
                    <span>Total {currency}</span>
                    <span className="font-medium">{totals.totalEur.toFixed(2)} {currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700">
                  <span>Total fără TVA</span>
                  <span className="font-medium">{displayTotal.toFixed(2)} RON</span>
                </div>

                {vatEnabled && (
                  <div className="flex justify-between pt-2 border-t border-slate-200 mt-2 text-slate-600">
                    <span>TVA {vatRate}%</span>
                    <span className="font-medium">{totals.vatAmountRon.toFixed(2)} RON</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-300 pt-2 mt-1">
                  <span>Total de plată</span>
                  <span>{(vatEnabled ? totals.totalWithVatRon : displayTotal).toFixed(2)} RON</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & footer */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Mențiuni</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Informații suplimentare..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Text footer</label>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setTab("preview")}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Preview
            </button>
            <button
              onClick={saveInvoice}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
              Salvează factura
            </button>
          </div>
        </div>
      ) : (
        <InvoicePreview
          company={company}
          client={client}
          items={computedItems}
          totals={totals}
          currency={currency}
          exchangeRate={exchangeRate}
          rateDate={rateDate}
          issueDate={issueDate}
          dueDate={dueDate}
          shipDate={shipDate}
          footerText={footerText}
          invoiceNumber={invoiceNumber || undefined}
        />
      )}

      {/* Exit confirmation modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Modificări nesalvate</h2>
                <p className="text-sm text-slate-500 mt-1">Dacă părăsiți pagina, datele introduse se vor pierde.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowExitModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Rămân pe pagină
              </button>
              <button onClick={confirmExit} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                Părăsesc pagina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1.5 font-medium">{label}</label>
      {children}
    </div>
  );
}