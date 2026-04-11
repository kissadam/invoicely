export const dynamic = "force-dynamic";

import { Building2 } from "lucide-react";
import { requirePageSession } from "@/lib/session";
import NewCompanyClient from "./NewCompanyClient";

export default async function NewCompanyPage() {
  await requirePageSession();

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Building2 size={22} className="text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companie nouă</h1>
          <p className="text-sm text-slate-500 mt-0.5">Completează datele noii companii</p>
        </div>
      </div>

      <NewCompanyClient />
    </div>
  );
}