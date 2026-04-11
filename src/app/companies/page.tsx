export const dynamic = "force-dynamic";

/**
 * Companies (supplier) management page
 */

import { prisma } from "@/lib/prisma";
import { Building2 } from "lucide-react";
import CompanyForm from "@/components/CompanyForm";
import { requirePageSession } from "@/lib/session";

export default async function CompaniesPage() {
  const userId = await requirePageSession();
  const companies = await prisma.company.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Building2 size={22} className="text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compania mea</h1>
          <p className="text-sm text-slate-500 mt-0.5">Datele furnizorului care apar pe facturi</p>
        </div>
      </div>

      <CompanyForm existing={companies[0] ?? null} />
    </div>
  );
}