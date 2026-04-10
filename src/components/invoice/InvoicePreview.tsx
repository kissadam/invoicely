"use client";

import type { InvoiceItemForm, InvoiceTotals } from "@/types/invoice";
import { formatExchangeRateLine } from "@/lib/bnr";
import { formatCurrency } from "@/lib/calculations";

interface CompanyInfo {
  id: string;
  name: string;
  cui: string;
  address: string;
  bank?: string | null;
  iban?: string | null;
  vatPayer?: boolean;
}

interface Props {
  company: CompanyInfo | null;
  client: { name: string; address: string; cui: string; vatPayer: boolean } | null;
  items: InvoiceItemForm[];
  totals: InvoiceTotals;
  currency: string;
  exchangeRate: number;
  rateDate: string;
  issueDate: string;
  dueDate: string;
  shipDate: string;
  footerText: string;
  invoiceNumber?: string;
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function InvoicePreview({
  company, client, items, totals, currency, exchangeRate, rateDate,
  issueDate, dueDate, shipDate, footerText, invoiceNumber = "INV-DRAFT",
}: Props) {
  const needsRate = currency !== "RON";
  const validItems = items.filter((i) => i.name.trim());
  const exchangeLine = needsRate && exchangeRate > 0 && rateDate ? formatExchangeRateLine(exchangeRate, currency, rateDate) : "";
  const accent = "#2563eb";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 13, color: "#1a1a1a", padding: "36px 44px" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, borderBottom: `3px solid ${accent}`, paddingBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: accent, letterSpacing: "-0.3px" }}>
            {company?.name ?? <span style={{ color: "#94a3b8" }}>Compania ta</span>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: accent, color: "#fff", padding: "5px 16px", borderRadius: 5, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", display: "inline-block" }}>
              FACTURĂ FISCALĂ
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginTop: 5 }}>{invoiceNumber}</div>
          </div>
        </div>

        {/* ── FURNIZOR | CLIENT ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", fontWeight: 600, marginBottom: 6 }}>Furnizor</div>
            {company ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{company.name}</div>
                <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.7, marginTop: 4 }}>
                  {company.cui && <div>CUI: {company.vatPayer ? `RO${company.cui.replace(/^RO/i, "")}` : company.cui}</div>}
                  {company.address && <div>{company.address}</div>}
                  {company.bank && <div>Bancă: {company.bank}</div>}
                  {company.iban && <div>IBAN: {company.iban}</div>}
                </div>
              </>
            ) : (
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Completați datele în secțiunea Companii</div>
            )}
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", fontWeight: 600, marginBottom: 6 }}>
              Client {client ? (client.vatPayer ? "(Plătitor TVA)" : "(Neplătitor TVA)") : ""}
            </div>
            {client ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{client.name}</div>
                <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.7, marginTop: 4 }}>
                  {client.cui && <div>CUI: {client.vatPayer ? `RO${client.cui.replace(/^RO/i, "")}` : client.cui}</div>}
                  {client.address && <div>{client.address}</div>}
                </div>
              </>
            ) : (
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Căutați clientul după CUI</div>
            )}
          </div>
        </div>

        {/* ── SERVICII TABLE ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
          <thead>
            <tr style={{ background: accent, color: "#fff", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {[
                "Nr.", "Denumirea serviciilor", "U.M.", "Cantitate",
                `Preț unitar ${currency}`, `Subtotal ${currency}`,
                ...(needsRate ? ["Subtotal RON"] : []),
              ].map((h, i) => (
                <th key={i} style={{ padding: "9px 10px", textAlign: i === 0 || i === 2 ? "center" : i >= 3 ? "right" : "left", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {validItems.length === 0 ? (
              <tr>
                <td colSpan={needsRate ? 7 : 6} style={{ padding: "18px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>Niciun articol adăugat</td>
              </tr>
            ) : validItems.map((item) => (
              <tr key={item.position} style={{ borderBottom: "1px solid #f1f5f9", background: item.position % 2 === 0 ? "#f8fafc" : "#fff" }}>
                <td style={{ padding: "7px 10px", textAlign: "center", fontSize: 12 }}>{item.position}</td>
                <td style={{ padding: "7px 10px", fontSize: 12 }}>{item.name}</td>
                <td style={{ padding: "7px 10px", textAlign: "center", fontSize: 12 }}>{item.unit}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontSize: 12 }}>{item.quantity}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontSize: 12 }}>{item.priceEur.toFixed(2)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontSize: 12 }}>{item.subtotalEur.toFixed(2)}</td>
                {needsRate && <td style={{ padding: "7px 10px", textAlign: "right", fontSize: 12, fontWeight: 600 }}>{item.subtotalRon.toFixed(2)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── BNR CURS ── */}
        {exchangeLine && (
          <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", marginBottom: 16, padding: "8px 10px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
            {exchangeLine}
          </div>
        )}

        {/* ── DATES + TOTALS ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 28, fontSize: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Data emiterii</div>
              <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 3 }}>{fmtDate(issueDate)}</div>
            </div>
            {shipDate && (
              <div>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Data expediției</div>
                <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 3 }}>{fmtDate(shipDate)}</div>
              </div>
            )}
            {dueDate && (
              <div>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Termen de plată</div>
                <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 3 }}>{fmtDate(dueDate)}</div>
              </div>
            )}
          </div>

          <div style={{ minWidth: 260 }}>
            {needsRate && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                <span>Total {currency}</span>
                <span style={{ fontWeight: 500 }}>{formatCurrency(totals.totalEur, currency)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              <span>Total de plată</span>
              <span>{formatCurrency(needsRate ? totals.totalRon : totals.totalEur, "RON")}</span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
          <p style={{ fontSize: 10, color: "#64748b", fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>{footerText}</p>
        </div>

      </div>
    </div>
  );
}