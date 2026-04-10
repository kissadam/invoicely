/**
 * Invoice calculation logic
 * All monetary rounding uses 2 decimal places (standard accounting).
 */

import type { InvoiceItemForm, InvoiceTotals } from "@/types/invoice";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Compute subtotals for a single line item.
 * Mutates + returns the item (for convenience in form handlers).
 */
export function computeItem(
  item: Pick<InvoiceItemForm, "quantity" | "priceEur">,
  exchangeRate: number
): { subtotalEur: number; subtotalRon: number } {
  const subtotalEur = round2(item.quantity * item.priceEur);
  const subtotalRon = round2(subtotalEur * exchangeRate);
  return { subtotalEur, subtotalRon };
}

/**
 * Recompute all items and return totals.
 * Call this whenever any item or the exchange rate changes.
 */
export function computeInvoice(
  items: InvoiceItemForm[],
  exchangeRate: number,
  vatRate = 0,
): { items: InvoiceItemForm[]; totals: InvoiceTotals } {
  let totalEur = 0;
  let totalRon = 0;

  const computed = items.map((item) => {
    const { subtotalEur, subtotalRon } = computeItem(item, exchangeRate);
    totalEur += subtotalEur;
    totalRon += subtotalRon;
    return { ...item, subtotalEur, subtotalRon };
  });

  const tEur = round2(totalEur);
  const tRon = round2(totalRon);
  const vatAmountRon = round2(tRon * vatRate / 100);
  const totalWithVatRon = round2(tRon + vatAmountRon);

  return {
    items: computed,
    totals: {
      totalEur: tEur,
      totalRon: tRon,
      vatRate,
      vatAmountRon,
      totalWithVatRon,
    },
  };
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/**
 * Generate sequential invoice number.
 * Format: INV-YYYY-NNN (e.g. INV-2024-042)
 */
export function generateInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(3, "0")}`;
}