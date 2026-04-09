/**
 * BNR (National Bank of Romania) exchange rate fetcher
 * Source: https://www.bnr.ro/nbrfxrates.xml
 */

import { parseStringPromise } from "xml2js";

const BNR_URL = "https://www.bnr.ro/nbrfxrates.xml";
const TIMEOUT_MS = 10000;

interface BnrRate {
  $: { currency: string; multiplier?: string };
  _: string;
}

interface BnrXmlBody {
  OrigCurrency: string[];
  Cube: Array<{ $: { date: string }; Rate: BnrRate[] }>;
}

interface BnrXmlRoot {
  DataSet: { Body: BnrXmlBody[] };
}

export interface ExchangeRate {
  currency: string;
  rate: number;       // X RON per 1 unit of currency
  date: string;
  fetchedAt: string;
}

let xmlCache: { xml: string; ts: number } | null = null;

async function fetchXml(): Promise<string> {
  // Cache the raw XML for 30 min to avoid hammering BNR
  if (xmlCache && Date.now() - xmlCache.ts < 30 * 60 * 1000) {
    return xmlCache.xml;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BNR_URL, {
      signal: controller.signal,
      headers: { Accept: "application/xml" },
    });
    if (!res.ok) throw new Error(`BNR HTTP ${res.status}`);
    const xml = await res.text();
    xmlCache = { xml, ts: Date.now() };
    return xml;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("BNR rate fetch timeout");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch RON rate for any currency supported by BNR (EUR, USD, GBP, etc.)
 * Returns the most recent rate available (typically previous business day).
 * For RON itself, returns rate = 1.
 */
export async function fetchBnrRate(currency: string): Promise<ExchangeRate> {
  const upper = currency.toUpperCase();

  if (upper === "RON") {
    return { currency: "RON", rate: 1, date: new Date().toISOString().split("T")[0], fetchedAt: new Date().toISOString() };
  }

  const xml = await fetchXml();
  const parsed = (await parseStringPromise(xml, { explicitArray: true })) as BnrXmlRoot;
  const cubes = parsed.DataSet.Body[0].Cube;

  for (let i = cubes.length - 1; i >= 0; i--) {
    const cube = cubes[i];
    const entry = cube.Rate?.find((r: BnrRate) => r.$?.currency === upper);
    if (entry) {
      const multiplier = entry.$?.multiplier ? parseInt(entry.$.multiplier, 10) : 1;
      const rate = parseFloat(entry._) / multiplier;
      return { currency: upper, rate, date: cube.$.date, fetchedAt: new Date().toISOString() };
    }
  }

  throw new Error(`${upper} rate not found in BNR XML feed`);
}

/** @deprecated use fetchBnrRate("EUR") */
export async function fetchBnrEurRate() {
  const r = await fetchBnrRate("EUR");
  return { eur: r.rate, date: r.date, fetchedAt: r.fetchedAt };
}

export function formatExchangeRateLine(rate: number, currency: string, date: string): string {
  const formatted = new Date(date).toLocaleDateString("ro-RO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  return `Curs ${currency} din ziua precedentă facturării (${formatted}): 1 ${currency} = ${rate.toFixed(4)} RON`;
}