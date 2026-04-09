export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Setări</h1>
      <p className="text-sm text-slate-500 mb-6">Configurați aplicația</p>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <p><strong className="text-slate-800 dark:text-slate-100">Baza de date:</strong> PostgreSQL via Prisma</p>
        <p><strong className="text-slate-800 dark:text-slate-100">ANAF API:</strong> webservicesp.anaf.ro/api/PlatitorTvaRest/v8/tva</p>
        <p><strong className="text-slate-800 dark:text-slate-100">BNR XML:</strong> www.bnr.ro/nbrfxrates.xml</p>
        <p><strong className="text-slate-800 dark:text-slate-100">PDF:</strong> Puppeteer (Chromium headless)</p>
        <hr className="border-slate-200 dark:border-slate-700" />
        <p className="text-xs text-slate-400">
          Configurați <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">.env</code> cu DATABASE_URL înainte de prima utilizare.
          Rulați <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">npm run db:push</code> pentru a crea tabelele.
        </p>
      </div>
    </div>
  );
}