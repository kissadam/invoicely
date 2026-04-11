"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

const NO_SHELL = ["/login", "/accept-terms", "/privacy-policy", "/terms-and-conditions"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (NO_SHELL.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}