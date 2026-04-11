/**
 * Parses a natural-language invoice description into structured invoice data.
 * No external API — pure regex + heuristics.
 *
 * Supports inputs like:
 *   "Invoice for website design for Acme SRL 1200 EUR"
 *   "Servicii SEO pentru Client X 500 RON"
 *   "Consulting for John Doe 2500"
 */

export interface ParsedInvoice {
  clientName:  string;
  description: string;
  amount:      number;
  currency:    string;
  vatRate:     number; // 0 or 19
  notes:       string;
}

const CURRENCIES: Record<string, string> = {
  EUR: "EUR", EURO: "EUR", "€": "EUR",
  USD: "USD", "$": "USD",
  RON: "RON", LEI: "RON",
  GBP: "GBP", "£": "GBP",
  CHF: "CHF", SEK: "SEK", DKK: "DKK", NOK: "NOK",
};

// Map service keywords → professional description
const SERVICE_MAP: Array<[RegExp, string]> = [
  [/web\s*design|website\s*design|site\s*web/i,          "Website design services including UI/UX design and final asset delivery"],
  [/web\s*dev|website\s*dev|dezvoltare\s*web/i,           "Website development services including frontend and backend implementation"],
  [/seo/i,                                                 "SEO optimization services including keyword research and on-page improvements"],
  [/logo|brand|identitate/i,                               "Brand identity and logo design services"],
  [/foto|photog|fotografii/i,                              "Photography services including editing and final file delivery"],
  [/video|filmare|editare\s*video/i,                       "Video production and editing services"],
  [/consult|consulting|consultanță/i,                      "Professional consulting services"],
  [/marketing|campanie|ads/i,                              "Digital marketing campaign management services"],
  [/social\s*media|postări/i,                              "Social media management and content creation services"],
  [/copy|redact|text|content/i,                            "Copywriting and content creation services"],
  [/grafic|design\s*grafic|graphic/i,                      "Graphic design services including final print-ready deliverables"],
  [/mentenanță|maintenance|suport/i,                       "Website maintenance and technical support services"],
  [/aplicat|app|mobile|flutter|react\s*native/i,           "Mobile application development services"],
];

function detectCurrency(text: string): { currency: string; cleaned: string } {
  // Symbol prefix: €1200, $500
  const symbolPrefix = text.match(/([€$£])\s*([\d.,]+)/);
  if (symbolPrefix) {
    const currency = CURRENCIES[symbolPrefix[1]] ?? "EUR";
    return { currency, cleaned: text.replace(symbolPrefix[0], symbolPrefix[2]) };
  }
  // Word match: 1200 EUR, EUR 1200
  for (const [key, val] of Object.entries(CURRENCIES)) {
    if (key.length < 2) continue; // skip symbols already handled
    const re = new RegExp(`\\b${key}\\b`, "i");
    if (re.test(text)) {
      return { currency: val, cleaned: text.replace(re, "") };
    }
  }
  return { currency: "EUR", cleaned: text };
}

function detectAmount(text: string): { amount: number; cleaned: string } {
  // Match numbers like 1200, 1,200, 1.200, 1200.50, 1,200.50
  const match = text.match(/\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\b/);
  if (match) {
    const raw = match[1].replace(/,(\d{3})/g, "$1").replace(",", ".");
    const amount = parseFloat(raw);
    if (!isNaN(amount)) {
      return { amount, cleaned: text.replace(match[0], "") };
    }
  }
  return { amount: 0, cleaned: text };
}

function detectClient(text: string): { clientName: string; cleaned: string } {
  // "for ClientName" or "pentru ClientName" — last occurrence before amount
  const patterns = [
    /\b(?:for|pentru|catre|client[:\s]+)\s+([A-ZĂÂÎȘȚ][^\d,.\n]{2,40}?)(?:\s+\d|\s*$)/i,
    /\b(?:for|pentru)\s+([A-Za-zÀ-ÿ][^\d,.\n]{2,40}?)(?:\s+\d|\s*$)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const name = m[1].trim().replace(/\s+/g, " ");
      if (name.length > 1) {
        return { clientName: name, cleaned: text.replace(m[0], " ") };
      }
    }
  }
  return { clientName: "", cleaned: text };
}

function professionalDescription(raw: string): string {
  for (const [re, desc] of SERVICE_MAP) {
    if (re.test(raw)) return desc;
  }
  // Fallback: clean up and capitalise
  const cleaned = raw
    .replace(/\b(invoice|factură?|factura|pentru|for|services?|servicii)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Professional services as agreed";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() + " services";
}

export function parseInvoicePrompt(input: string): ParsedInvoice {
  let text = input.trim();

  // Strip common preambles
  text = text.replace(/^\s*(invoice|factură?|factura)\s*(for|pentru|:)?\s*/i, "");

  // Normalise "1000euro" / "500ron" → "1000 euro" / "500 ron" so \b boundaries work
  text = text.replace(/(\d)(eur(?:o)?|usd|ron|gbp|chf|lei|sek|dkk|nok)\b/gi, "$1 $2");

  const { currency, cleaned: t1 } = detectCurrency(text);
  const { amount,   cleaned: t2 } = detectAmount(t1);
  const { clientName, cleaned: t3 } = detectClient(t2);

  // Remaining text = service description
  const serviceRaw = t3.replace(/\s+/g, " ").trim();
  const description = professionalDescription(serviceRaw || input);

  // VAT: default 21% (Romanian client). If client name looks foreign (contains Ltd/Inc/GmbH etc.), 0%
  const foreignIndicators = /\b(ltd|inc|llc|gmbh|sas|srl\b.*\b(?:fr|de|uk|es|it)|bv|ab|oy)\b/i;
  const vatRate = foreignIndicators.test(clientName) ? 0 : 21;

  const vatNote = vatRate === 0
    ? "Taxare inversă – TVA 0% (reverse charge) conform art. 278 Codul Fiscal."
    : "TVA 19% aplicat conform legislației fiscale române.";

  return {
    clientName:  clientName || "Client",
    description,
    amount,
    currency,
    vatRate,
    notes: `${vatNote} Termen de plată: 30 zile de la emitere.`,
  };
}