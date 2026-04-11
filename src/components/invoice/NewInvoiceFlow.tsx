"use client";

import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, PenLine, Loader2 } from "lucide-react";
import InvoiceEditor from "./InvoiceEditor";
import type { EditableInvoice } from "./InvoiceEditor";
import type { SelectedClient } from "./ClientSearch";
import { parseInvoicePrompt } from "@/lib/parseInvoicePrompt";

/** Fades in children after mount — used for the editor entrance animation. */
function FadeIn({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className="transition-all duration-500 ease-out"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)" }}
    >
      {children}
    </div>
  );
}

interface SavedClient {
  id: string;
  cui: string | null;
  name: string;
  address: string | null;
  vatPayer: boolean;
}

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
  const [exiting, setExiting] = useState(false);
  const [prefill, setPrefill] = useState<Partial<EditableInvoice> | undefined>();
  const [initialClientQuery, setInitialClientQuery] = useState<string | undefined>();

  // Pre-load saved clients so we can match the parsed name against them
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setSavedClients)
      .catch(() => {});
  }, []);

  function handleGenerate() {
    if (!input.trim()) return;
    setLoading(true);
    setExiting(true);

    setTimeout(() => {
      const parsed = parseInvoicePrompt(input);

      const today = new Date().toISOString().split("T")[0];
      const due   = new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0];

      // ── Client matching ──────────────────────────────────────────────────────
      // Strategy: scan the raw input directly against every saved client name.
      // This is far more reliable than trusting the regex parser to extract a
      // name, because Romanian constructs like "in valoare de" confuse it.
      //
      // We strip common legal suffixes (SRL, SA …) so "Ideal Concept" matches
      // a saved client called "Ideal Concept SRL". Sort longest-first so we
      // always prefer the most-specific match.
      const inputLower = input.toLowerCase();

      function stripSuffix(name: string) {
        return name.replace(/\b(srl|sa|scs|snc|ra|sas|llc|ltd|inc|gmbh|bv|ag|oy|ab)\b\.?/gi, "").trim();
      }

      const byLength = [...savedClients].sort((a, b) => b.name.length - a.name.length);

      const directMatch = byLength.find((c) => {
        const full  = c.name.toLowerCase();
        const short = stripSuffix(c.name).toLowerCase();
        return (
          inputLower.includes(full) ||
          (short.length > 3 && inputLower.includes(short))
        );
      });

      let matchedClient: SelectedClient | undefined;
      let clientQuery: string | undefined;

      if (directMatch) {
        matchedClient = {
          id:       directMatch.id,
          cui:      directMatch.cui      ?? "",
          name:     directMatch.name,
          address:  directMatch.address  ?? "",
          vatPayer: directMatch.vatPayer,
        };
      } else {
        // No saved client found — use whatever the regex extracted as a hint
        const parsedName = parsed.clientName && parsed.clientName !== "Client"
          ? parsed.clientName
          : undefined;
        if (parsedName) clientQuery = parsedName;
      }

      const initial: Partial<EditableInvoice> = {
        currency:  parsed.currency,
        issueDate: today,
        dueDate:   due,
        notes:     parsed.notes,
        ...(matchedClient ? { client: matchedClient } : {}),
        // Always include one item row; price is 0 if no amount was detected
        items: [{
          position:    1,
          name:        parsed.description,
          unit:        "buc",
          quantity:    1,
          priceEur:    parsed.amount,
          subtotalEur: parsed.amount,
          subtotalRon: 0,
        }],
      };

      setPrefill(initial);
      setInitialClientQuery(clientQuery);
      setLoading(false);
      setMode("editor");
    }, 400);
  }

  if (mode === "editor") {
    return (
      <FadeIn>
        <InvoiceEditor
          initialData={prefill as EditableInvoice | undefined}
          initialClientQuery={initialClientQuery}
        />
      </FadeIn>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] px-4 transition-all duration-300 ease-in"
      style={{ opacity: exiting ? 0 : 1, transform: exiting ? "translateY(-8px)" : "translateY(0)" }}
    >

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
            className="w-full px-4 py-3.5 pr-14 text-sm border border-blue-300 rounded-xl resize-none placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-shadow duration-200"
            style={{
              boxShadow: "0 0 0 3px rgba(59,130,246,0.15), 0 1px 3px rgba(0,0,0,0.07)",
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 4px rgba(59,130,246,0.30), 0 1px 3px rgba(0,0,0,0.07)"; }}
            onBlur={(e)  => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15), 0 1px 3px rgba(0,0,0,0.07)"; }}
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