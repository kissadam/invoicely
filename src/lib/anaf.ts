/**
 * ANAF API integration — Romanian Tax Authority CUI lookup
 * Endpoint: POST https://webservicesp.anaf.ro/api/PlatitorTvaRest/v8/tva
 */

import type { AnafCompanyData } from "@/types/invoice";

const ANAF_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";
const TIMEOUT_MS = 8000;

interface AnafRequestItem {
  cui: number;
  data: string; // YYYY-MM-DD
}

interface AnafRawCompany {
  cui: number;
  data: string;
  denumire?: string;
  adresa?: string;
  stare_inregistrare?: string;
  scpTVA?: boolean;
  data_inceput_ScpTVA?: string;
  judet?: string;
  telefon?: string;
  cod_postal?: string;
  act?: string;
  stradaDetalii?: string;
  nrSediuSocial?: string;
  // ANAF response nests data differently depending on version — handle both
  date_generale?: {
    denumire?: string;
    adresa?: string;
    judet?: string;
    telefon?: string;
  };
  inregistrare_scop_Tva?: {
    scpTVA?: boolean;
    perioade_TVA?: Array<{ data_inceput_ScpTVA?: string; data_sfarsit_ScpTVA?: string }>;
  };
}

interface AnafResponse {
  cod: number;
  message: string;
  found: AnafRawCompany[];
  notFound: number[];
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}


export function parseCUI(input: string): number | null {
  // Strip "RO" prefix common in Romanian invoices
  const cleaned = input.replace(/^RO/i, "").trim().replace(/\D/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  if (isNaN(n)) return null;
  return n;
}

function parseAnafCompany(raw: AnafRawCompany, knownCui: string): AnafCompanyData {
  // ANAF v8 response shape — fields may live at top level or inside date_generale
  const name =
    raw.denumire ||
    raw.date_generale?.denumire ||
    "Necunoscut";

  const address =
    raw.adresa ||
    raw.date_generale?.adresa ||
    "";

  const vatPayer =
    raw.scpTVA ??
    raw.inregistrare_scop_Tva?.scpTVA ??
    false;

  const vatStartDate =
    raw.data_inceput_ScpTVA ||
    raw.inregistrare_scop_Tva?.perioade_TVA?.[0]?.data_inceput_ScpTVA;

  const county =
    raw.judet ||
    raw.date_generale?.judet;

  const phone =
    raw.telefon ||
    raw.date_generale?.telefon;

  return {
    cui: raw.cui ? String(raw.cui) : knownCui,
    name: name.trim(),
    address: address.trim(),
    vatPayer,
    vatStartDate,
    county,
    phone,
  };
}

/**
 * Fetch company data from ANAF API.
 * Returns null if company not found.
 * Throws on network/timeout errors (caller should handle).
 */
export async function fetchAnafCompany(cui: string): Promise<AnafCompanyData | null> {
  const cuiNumber = parseCUI(cui);
  if (cuiNumber === null) {
    throw new Error(`CUI invalid: "${cui}"`);
  }

  const payload: AnafRequestItem[] = [
    { cui: cuiNumber, data: todayString() },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(ANAF_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("ANAF API timeout — server did not respond in time");
    }
    throw new Error(`ANAF API network error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`ANAF API HTTP ${response.status}: ${response.statusText}`);
  }

  const data: AnafResponse = await response.json();

  if (data.notFound?.includes(cuiNumber)) {
    return null;
  }

  if (!data.found || data.found.length === 0) {
    return null;
  }

  return parseAnafCompany(data.found[0], cui);
}