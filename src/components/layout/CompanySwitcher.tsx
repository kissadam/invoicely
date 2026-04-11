"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Plus, Check, Loader2 } from "lucide-react";
import clsx from "clsx";

interface Company {
  id: string;
  name: string;
}

export default function CompanySwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => {
        if (data?.companies) {
          setCompanies(data.companies);
          setActiveCompanyId(data.activeCompanyId ?? null);
        }
      })
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const active = companies.find((c) => c.id === activeCompanyId);

  async function switchCompany(id: string) {
    if (id === activeCompanyId) { setOpen(false); return; }
    setSwitching(id);
    await fetch("/api/companies/switch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: id }),
    });
    // Full reload so all server components re-fetch with new company scope
    router.refresh();
    window.location.href = "/";
  }

  return (
    <div ref={ref} className="relative px-3 py-2">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Building2 size={15} className="shrink-0 text-slate-400" />
        <span className="flex-1 text-left truncate font-medium">
          {active?.name ?? "Selectează compania"}
        </span>
        <ChevronDown size={14} className={clsx("shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
          {companies.length > 0 && (
            <ul className="py-1 max-h-48 overflow-y-auto">
              {companies.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => switchCompany(c.id)}
                    disabled={switching === c.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    {switching === c.id ? (
                      <Loader2 size={13} className="shrink-0 animate-spin text-blue-500" />
                    ) : c.id === activeCompanyId ? (
                      <Check size={13} className="shrink-0 text-blue-500" />
                    ) : (
                      <span className="w-[13px] shrink-0" />
                    )}
                    <span className="flex-1 text-left truncate">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={clsx("border-t border-slate-100 dark:border-slate-700", companies.length === 0 && "border-t-0")}>
            <button
              onClick={() => { setOpen(false); router.push("/companies/new"); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
            >
              <Plus size={14} />
              Companie nouă
            </button>
          </div>
        </div>
      )}
    </div>
  );
}