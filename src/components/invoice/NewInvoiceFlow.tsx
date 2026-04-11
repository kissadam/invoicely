"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, PenLine, Loader2 } from "lucide-react";
import InvoiceEditor from "./InvoiceEditor";
import type { EditableInvoice } from "./InvoiceEditor";
import { parseInvoicePrompt } from "@/lib/parseInvoicePrompt";

const EXAMPLES = [
  "Website design for Acme SRL 1200 EUR",
  "Servicii SEO pentru Client X 500 RON",
  "Consulting for John Doe Ltd 2500 EUR",
  "Fotografii produs pentru Magazin Online 800 RON",
];

export default function NewInvoiceFlow() {
  const [mode, setMode]       = useState<"prompt" | "editor">("prompt");
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [prefill, setPrefill] = useState<Partial<EditableInvoice> | undefined>();

  function handleGenerate() {
    if (!input.trim()) return;
    setLoading(true);

    // Small delay so the spinner is visible, then parse synchronously
    setTimeout(() => {
      const parsed = parseInvoicePrompt(input);

      const today = new Date().toISOString().split("T")[0];
      const due   = new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0];

      const hasClient = parsed.clientName && parsed.clientName !== "Client";

      const initial: Partial<EditableInvoice> = {
        currency:  parsed.currency,
        issueDate: today,
        dueDate:   due,
        notes:     parsed.notes,
        ...(hasClient && {
          client: { id: undefined, cui: "", name: parsed.clientName, address: "", vatPayer: false },
        }),
        items: parsed.amount > 0
          ? [{
              position:    1,
              name:        parsed.description,
              unit:        "buc",
              quantity:    1,
              priceEur:    parsed.amount,
              subtotalEur: parsed.amount,
              subtotalRon: 0,
            }]
          : [],
      };

      setPrefill(initial);
      setLoading(false);
      setMode("editor");
    }, 400);
  }

  if (mode === "editor") {
    return (
      <InvoiceEditor
        initialData={prefill as EditableInvoice | undefined}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">

      {/* Icon + heading */}
      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
        <Sparkles size={22} className="text-blue-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Factură nouă cu AI</h2>
      <p className="text-sm text-slate-500 mb-8 text-center max-w-sm">
        Descrie factura în câteva cuvinte și o completăm automat pentru tine.
      </p>

      {/* Input */}
      <div className="w-full max-w-xl">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
            }}
            placeholder='ex: "Website design for Acme SRL 1200 EUR"'
            rows={2}
            className="w-full px-4 py-3.5 pr-14 text-sm border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder-slate-400"
          />
          <button
            onClick={handleGenerate}
            disabled={!input.trim() || loading}
            className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            {loading
              ? <Loader2 size={16} className="animate-spin" />
              : <ArrowRight size={16} />
            }
          </button>
        </div>

        {/* Example chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">sau</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Manual button */}
        <button
          onClick={() => setMode("editor")}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors"
        >
          <PenLine size={15} />
          Completează manual
        </button>
      </div>
    </div>
  );
}