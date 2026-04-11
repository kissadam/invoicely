"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Settings,
  ChevronRight,
  LogOut,
  BarChart2,
  MessageCircleQuestion,
} from "lucide-react";
import clsx from "clsx";
import SupportModal from "./SupportModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

const NAV = [
  { href: "/",           icon: LayoutDashboard, label: "Dashboard"  },
  { href: "/invoices",   icon: FileText,        label: "Facturi"    },
  { href: "/clients",    icon: Users,           label: "Clienți"    },
  { href: "/analytics",  icon: BarChart2,       label: "Analytics"  },
  { href: "/companies",  icon: Building2,       label: "Companii"   },
  { href: "/settings",   icon: Settings,        label: "Setări"     },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [supportOpen, setSupportOpen] = useState(false);
  const { locale, setLocale } = useLanguage();
  const router = useRouter();

  function switchLocale(l: Locale) {
    setLocale(l);
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-700">
        <span className="text-lg font-bold text-blue-600">Invoicely</span>
        <span className="ml-1 text-xs text-slate-400 font-medium">RO</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                active
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        {session?.user?.email && (
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">{session.user.email}</p>
        )}
        <button
          onClick={() => setSupportOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors"
        >
          <MessageCircleQuestion size={14} />
          Support & Feedback
        </button>
        {/* Language toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => switchLocale("en")}
            className={clsx(
              "flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors",
              locale === "en"
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            🇬🇧 EN
          </button>
          <button
            onClick={() => switchLocale("ro")}
            className={clsx(
              "flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors",
              locale === "ro"
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            🇷🇴 RO
          </button>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Deconectare
        </button>
        <p className="text-xs text-slate-400 text-center pt-1">
          Proudly built by{" "}
          <a href="https://akvisuals.ro" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">
            akvisuals.ro
          </a>
        </p>
      </div>

      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} />}
    </aside>
  );
}