/**
 * Smart client name matching for the AI invoice flow.
 *
 * Three-pass strategy (fastest first):
 *   1. Alias cache   — remembered word→clientId pairs from previous matches
 *   2. Substring     — client name / suffix-stripped name contained in input
 *   3. Fuzzy (Levenshtein) — handles typos, abbreviations, partial names
 *
 * Aliases are persisted in localStorage and grow automatically every time a
 * match is found, so the matcher improves with each use.
 */

// ── Levenshtein distance ─────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  // Use two rows to keep memory O(n)
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// ── Alias persistence (localStorage) ────────────────────────────────────────

const ALIAS_KEY = "ivly_client_aliases_v1";

type AliasMap = Record<string, string>; // word → clientId

function loadAliases(): AliasMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(ALIAS_KEY) ?? "{}"); }
  catch { return {}; }
}

/** Call this after a successful match to teach the matcher for next time. */
export function recordAliases(words: string[], clientId: string) {
  if (typeof window === "undefined") return;
  const map = loadAliases();
  for (const w of words) map[w] = clientId;
  localStorage.setItem(ALIAS_KEY, JSON.stringify(map));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripSuffix(name: string): string {
  return name
    .replace(/\b(srl|sa|scs|snc|ra|sas|llc|ltd|inc|gmbh|bv|ag|oy|ab)\b\.?/gi, "")
    .trim();
}

/** Tokenise a string into words ≥3 chars. */
function words(text: string): string[] {
  return text.toLowerCase().split(/[\s,.:;!?()\-]+/).filter(w => w.length >= 3);
}

/**
 * Best fuzzy score (0–1, higher = better) between a query word and a client name.
 * Checks the full name and each individual name token.
 */
function fuzzyScore(queryWord: string, clientName: string): number {
  const targets = [clientName.toLowerCase(), stripSuffix(clientName).toLowerCase(), ...words(clientName)];
  let best = 0;
  for (const t of targets) {
    if (!t) continue;
    const dist = levenshtein(queryWord, t);
    const maxLen = Math.max(queryWord.length, t.length);
    const score = 1 - dist / maxLen;
    if (score > best) best = score;
  }
  return best;
}

// ── Main export ──────────────────────────────────────────────────────────────

export interface ClientRecord {
  id: string;
  name: string;
  cui: string | null;
  address: string | null;
  vatPayer: boolean;
}

export interface MatchResult {
  client: ClientRecord;
  /** Words from the input that triggered this match — saved as aliases. */
  matchedWords: string[];
}

/**
 * Find the best matching client for a raw user input string.
 * Returns null if no confident match is found.
 */
export function matchClient(input: string, clients: ClientRecord[]): MatchResult | null {
  if (!clients.length) return null;

  const inputLower = input.toLowerCase();
  const inputWords = words(input);

  // Sort longest-name-first so we always prefer the most specific match
  const sorted = [...clients].sort((a, b) => b.name.length - a.name.length);

  // ── Pass 1: alias cache ──────────────────────────────────────────────────
  const aliases = loadAliases();
  for (const w of inputWords) {
    const cid = aliases[w];
    if (!cid) continue;
    const client = sorted.find(c => c.id === cid);
    if (client) return { client, matchedWords: [w] };
  }

  // ── Pass 2: substring match ──────────────────────────────────────────────
  for (const c of sorted) {
    const full  = c.name.toLowerCase();
    const short = stripSuffix(c.name).toLowerCase();
    const matchedWords: string[] = [];

    if (inputLower.includes(full)) {
      matchedWords.push(...words(full));
    } else if (short.length >= 3 && inputLower.includes(short)) {
      matchedWords.push(...words(short));
    } else {
      // Check if any input word is a substring of the client name
      const hits = inputWords.filter(w => full.includes(w) || (short.length >= 3 && short.includes(w)));
      if (hits.length > 0) matchedWords.push(...hits);
    }

    if (matchedWords.length > 0) return { client: c, matchedWords };
  }

  // ── Pass 3: fuzzy matching ───────────────────────────────────────────────
  // For each client, find the best-scoring input word.
  // Threshold: score ≥ 0.72 (allows ~1-2 character differences on short names).
  const THRESHOLD = 0.72;

  let bestScore = 0;
  let bestResult: MatchResult | null = null;

  for (const c of sorted) {
    for (const w of inputWords) {
      const score = fuzzyScore(w, c.name);
      if (score >= THRESHOLD && score > bestScore) {
        bestScore = score;
        bestResult = { client: c, matchedWords: [w] };
      }
    }
  }

  return bestResult;
}