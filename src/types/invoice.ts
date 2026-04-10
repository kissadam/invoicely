// ─── Template system ──────────────────────────────────────────────────────────

export type ColumnKey =
  | "position"
  | "name"
  | "unit"
  | "quantity"
  | "priceEur"
  | "subtotalEur"
  | "subtotalRon";

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  enabled: boolean;
  width?: string; // CSS width hint, e.g. "8%"
  align?: "left" | "center" | "right";
}

export interface TemplateConfig {
  columns: ColumnConfig[];
  footerText: string;
  showExchangeRateLine: boolean;
  primaryCurrency: "RON" | "EUR";
  accentColor?: string; // hex
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "position",    label: "Nr.",                                  enabled: true,  width: "5%",   align: "center" },
  { key: "name",        label: "Denumirea serviciilor",                enabled: true,  width: "35%",  align: "left"   },
  { key: "unit",        label: "U.M.",                                 enabled: true,  width: "8%",   align: "center" },
  { key: "quantity",    label: "Cantitate",                            enabled: true,  width: "10%",  align: "right"  },
  { key: "priceEur",    label: "Preț unitar EUR",                      enabled: true,  width: "14%",  align: "right"  },
  { key: "subtotalEur", label: "Subtotal EUR",                         enabled: true,  width: "14%",  align: "right"  },
  { key: "subtotalRon", label: "Subtotal RON",                         enabled: true,  width: "14%",  align: "right"  },
];

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  columns: DEFAULT_COLUMNS,
  footerText:
    "Factura circulă fără semnătura și ștampila conform Lg. 227/2015-Codul fiscal art 319(aliniat 29).",
  showExchangeRateLine: true,
  primaryCurrency: "RON",
  accentColor: "#2563eb",
};

// ─── Form / UI types ──────────────────────────────────────────────────────────

export interface InvoiceItemForm {
  id?: string;
  position: number;
  name: string;
  unit: string;
  quantity: number;
  priceEur: number;
  subtotalEur: number;
  subtotalRon: number;
}

export interface InvoiceForm {
  number: string;
  clientId: string;
  companyId?: string;
  templateId?: string;
  issueDate: string;   // ISO date string
  dueDate?: string;
  shipDate?: string;
  exchangeRate: number;
  notes?: string;
  footerText?: string;
  items: InvoiceItemForm[];
}

// ─── API response types ───────────────────────────────────────────────────────

export interface AnafCompanyData {
  cui: string;
  name: string;
  address: string;
  vatPayer: boolean;
  vatStartDate?: string;
  county?: string;
  phone?: string;
}

export interface BnrRateResponse {
  rate: number;       // EUR→RON
  date: string;       // ISO date (the rate's reference date)
  fetchedAt: string;
}

export interface InvoiceTotals {
  totalEur: number;
  totalRon: number;
  vatRate: number;        // 0 = no VAT
  vatAmountRon: number;
  totalWithVatRon: number;
}