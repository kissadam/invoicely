import InvoiceEditor from "@/components/invoice/InvoiceEditor";

export default function NewInvoicePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Factură nouă</h1>
      <InvoiceEditor />
    </div>
  );
}