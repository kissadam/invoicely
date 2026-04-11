import NewInvoiceFlow from "@/components/invoice/NewInvoiceFlow";

export default function NewInvoicePage() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Factură nouă</h1>
      <NewInvoiceFlow />
    </div>
  );
}