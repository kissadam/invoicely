"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Building2, Plus } from "lucide-react";
import toast from "react-hot-toast";

export interface SelectedClient {
  id?: string;
  cui: string;
  name: string;
  address: string;
  vatPayer: boolean;
}

interface SavedClient {
  id: string;
  cui: string | null;
  name: string;
  address: string | null;
  vatPayer: boolean;
  currency: string;
}

interface Props {
  value: SelectedClient | null;
  onChange: (client: SelectedClient) => void;
}

export default function ClientSearch({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<SavedClient[]>([]);
  const [filtered, setFiltered] = useState<SavedClient[]>([]);
  const [open, setOpen] = useState(false);
  const [anafLoading, setAnafLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all saved clients once
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setSaved)
      .catch(() => {});
  }, []);

  // Filter saved clients on query change
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setFiltered(saved);
    } else {
      setFiltered(
        saved.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.cui ?? "").toLowerCase().includes(q)
        )
      );
    }
  }, [query, saved]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectSaved(c: SavedClient) {
    onChange({
      id: c.id,
      cui: c.cui ?? "",
      name: c.name,
      address: c.address ?? "",
      vatPayer: c.vatPayer,
    });
    setQuery(c.name);
    setOpen(false);
  }

  async function lookupAnaf() {
    const cui = query.trim();
    if (!cui) { toast.error("Introduceți un CUI pentru căutare ANAF"); return; }
    setAnafLoading(true);
    try {
      const res = await fetch(`/api/company/${encodeURIComponent(cui)}`);
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Firma nu a fost găsită în ANAF"); return; }
      const d = json.data;
      const client: SelectedClient = {
        cui: d.cui,
        name: d.name,
        address: d.address,
        vatPayer: d.vatPayer,
      };
      onChange(client);
      setQuery(d.name);
      setOpen(false);
      toast.success(`Firma găsită: ${d.name}`);
    } catch {
      toast.error("Eroare la căutarea ANAF");
    } finally {
      setAnafLoading(false);
    }
  }

  const isCuiLike = /^\d{4,}$/.test(query.trim().replace(/^RO/i, ""));

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && isCuiLike && lookupAnaf()}
            placeholder="Caută după nume sau CUI..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {isCuiLike && (
          <button
            onClick={lookupAnaf}
            disabled={anafLoading}
            title="Caută în ANAF"
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {anafLoading ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
            ANAF
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">
              {query.trim()
                ? isCuiLike
                  ? <span>Niciun rezultat. Apasă <strong>ANAF</strong> pentru căutare online.</span>
                  : "Niciun client găsit."
                : "Niciun client salvat."}
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
                Clienți salvați
              </div>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onMouseDown={() => selectSaved(c)}
                  className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <Building2 size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</div>
                    <div className="text-xs text-slate-400 flex gap-2 mt-0.5">
                      {c.cui && <span>CUI: {c.cui}</span>}
                      <span className={c.vatPayer ? "text-blue-500" : "text-slate-400"}>
                        {c.vatPayer ? "Plătitor TVA" : "Neplătitor TVA"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
          {isCuiLike && (
            <button
              onMouseDown={lookupAnaf}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors border-t border-slate-100 dark:border-slate-700"
            >
              <Plus size={14} />
              Caută „{query.trim()}" în ANAF
            </button>
          )}
        </div>
      )}

      {/* Selected client card */}
      {value && (
        <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
          <div className="font-semibold text-slate-800 dark:text-slate-100">{value.name}</div>
          <div className="text-xs text-slate-500 mt-0.5 flex gap-3">
            {value.cui && <span>CUI: {value.vatPayer ? `RO${value.cui.replace(/^RO/i, "")}` : value.cui}</span>}
            <span className={value.vatPayer ? "text-blue-600" : "text-slate-400"}>
              {value.vatPayer ? "Plătitor TVA" : "Neplătitor TVA"}
            </span>
          </div>
          {value.address && <div className="text-xs text-slate-400 mt-0.5">{value.address}</div>}
        </div>
      )}
    </div>
  );
}