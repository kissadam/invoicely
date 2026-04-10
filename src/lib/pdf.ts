/**
 * PDF generation using Puppeteer (HTML → PDF)
 * Called from the API route — runs server-side only.
 */

import type { Invoice, InvoiceItem, Client, Company } from "@prisma/client";
import type { TemplateConfig } from "@/types/invoice";
import { DEFAULT_TEMPLATE_CONFIG } from "@/types/invoice";
import { formatCurrency, formatNumber } from "./calculations";
import { formatExchangeRateLine } from "./bnr";

type FullInvoice = Invoice & {
  items: InvoiceItem[];
  client: Client;
  company: Company | null;
  template?: { config: unknown } | null;
  vatRate?: unknown;
  vatAmountRon?: unknown;
  totalWithVatRon?: unknown;
};

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function buildInvoiceHtml(invoice: FullInvoice): string {
  const config = (invoice.template?.config ?? DEFAULT_TEMPLATE_CONFIG) as TemplateConfig;
  const accent = config.accentColor ?? "#2563eb";
  const rate = Number(invoice.exchangeRate);

  const enabledColumns = config.columns.filter((c) => c.enabled);
  const headerRow = enabledColumns
    .map((c) => `<th style="padding:9px 10px;text-align:${c.align ?? "left"};width:${c.width ?? "auto"};font-weight:600;text-transform:uppercase;letter-spacing:0.05em;font-size:10px">${c.label}</th>`)
    .join("");

  const itemRows = invoice.items
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const cells = enabledColumns.map((col) => {
        let val = "";
        switch (col.key) {
          case "position":    val = String(item.position); break;
          case "name":        val = item.name; break;
          case "unit":        val = item.unit; break;
          case "quantity":    val = formatNumber(Number(item.quantity), 0); break;
          case "priceEur":    val = formatNumber(Number(item.priceEur), 2); break;
          case "subtotalEur": val = formatNumber(Number(item.subtotalEur), 2); break;
          case "subtotalRon": val = formatNumber(Number(item.subtotalRon), 2); break;
        }
        return `<td style="padding:8px 10px;text-align:${col.align ?? "left"};font-size:12px">${val}</td>`;
      });
      return `<tr style="border-bottom:1px solid #f1f5f9;background:${item.position % 2 === 0 ? "#f8fafc" : "#fff"}">${cells.join("")}</tr>`;
    })
    .join("");

  const supplierCui = invoice.company
    ? (invoice.company.vatPayer ? `RO${invoice.company.cui.replace(/^RO/i, "")}` : invoice.company.cui)
    : "";
  const clientCui = invoice.client.cui
    ? (invoice.client.vatPayer ? `RO${invoice.client.cui.replace(/^RO/i, "")}` : invoice.client.cui)
    : "";
  const vatLabel = invoice.client.vatPayer ? "(Plătitor TVA)" : "(Neplătitor TVA)";
  const footerNote = invoice.footerText ?? config.footerText;

  const invoiceCurrency = invoice.currency ?? "RON";
  const exchangeLine = config.showExchangeRateLine && invoiceCurrency !== "RON"
    ? `<div style="font-size:11px;color:#64748b;font-style:italic;margin-bottom:18px;padding:8px 10px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0">${formatExchangeRateLine(rate, invoiceCurrency, invoice.issueDate.toISOString())}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8"/>
<title>Factură ${invoice.number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 36px 44px; }
  table { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;border-bottom:3px solid ${accent};padding-bottom:14px">
    <div style="font-size:20px;font-weight:700;color:${accent}">${invoice.company?.name ?? "Furnizor"}</div>
    <div style="text-align:right">
      <div style="background:${accent};color:#fff;padding:5px 16px;border-radius:5px;font-size:11px;font-weight:600;letter-spacing:0.06em;display:inline-block">FACTURĂ FISCALĂ</div>
      <div style="font-size:18px;font-weight:700;color:#0f172a;margin-top:5px">${invoice.number}</div>
    </div>
  </div>

  <!-- FURNIZOR | CLIENT -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;font-weight:600;margin-bottom:6px">Furnizor</div>
      <div style="font-weight:700;font-size:13px;color:#0f172a">${invoice.company?.name ?? "—"}</div>
      <div style="font-size:11px;color:#475569;line-height:1.7;margin-top:4px">
        ${supplierCui ? `<div>CUI: ${supplierCui}</div>` : ""}
        ${invoice.company?.address ? `<div>${invoice.company.address}</div>` : ""}
        ${invoice.company?.bank ? `<div>Bancă: ${invoice.company.bank}</div>` : ""}
        ${invoice.company?.iban ? `<div>IBAN: ${invoice.company.iban}</div>` : ""}
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;font-weight:600;margin-bottom:6px">Client ${vatLabel}</div>
      <div style="font-weight:700;font-size:13px;color:#0f172a">${invoice.client.name}</div>
      <div style="font-size:11px;color:#475569;line-height:1.7;margin-top:4px">
        ${clientCui ? `<div>CUI: ${clientCui}</div>` : ""}
        ${invoice.client.address ? `<div>${invoice.client.address}</div>` : ""}
      </div>
    </div>
  </div>

  <!-- SERVICII TABLE -->
  <table style="margin-bottom:16px">
    <thead><tr style="background:${accent};color:#fff">${headerRow}</tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- BNR CURS -->
  ${exchangeLine}

  <!-- DATES + TOTALS -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div style="display:flex;gap:28px;font-size:12px">
      <div>
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Data emiterii</div>
        <div style="font-weight:600;color:#0f172a;margin-top:3px">${formatDate(invoice.issueDate)}</div>
      </div>
      ${invoice.shipDate ? `<div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Data expediției</div><div style="font-weight:600;color:#0f172a;margin-top:3px">${formatDate(invoice.shipDate)}</div></div>` : ""}
      ${invoice.dueDate ? `<div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Termen de plată</div><div style="font-weight:600;color:#0f172a;margin-top:3px">${formatDate(invoice.dueDate)}</div></div>` : ""}
    </div>
    <div style="min-width:260px">
      ${invoiceCurrency !== "RON" ? `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9">
        <span>Total ${invoiceCurrency}</span><span style="font-weight:500">${formatCurrency(Number(invoice.totalEur), invoiceCurrency)}</span>
      </div>` : ""}
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9">
        <span>Total fără TVA</span><span style="font-weight:500">${formatCurrency(Number(invoice.totalRon), "RON")}</span>
      </div>
      ${invoice.vatRate ? `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9">
        <span>TVA ${Number(invoice.vatRate)}%</span><span style="font-weight:500">${formatCurrency(Number(invoice.vatAmountRon), "RON")}</span>
      </div>` : ""}
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-size:15px;font-weight:700;color:#0f172a">
        <span>Total de plată</span><span>${formatCurrency(Number(invoice.vatRate ? invoice.totalWithVatRon : invoice.totalRon), "RON")}</span>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="border-top:1px solid #e2e8f0;padding-top:14px">
    ${invoice.notes ? `<p style="font-size:11px;color:#475569;margin-bottom:8px">Mențiuni: ${invoice.notes}</p>` : ""}
    <p style="font-size:10px;color:#64748b;font-style:italic;line-height:1.6">${footerNote}</p>
  </div>

</body>
</html>`;
}

export async function generateInvoicePdf(invoice: FullInvoice): Promise<Buffer> {
  const isVercel = !!process.env.VERCEL;

  let browser;
  if (isVercel) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromium = (await import("@sparticuz/chromium" as string)) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const puppeteerCore = (await import("puppeteer-core" as string)) as any;
    browser = await puppeteerCore.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    const puppeteer = await import("puppeteer");
    browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  try {
    const page = await browser.newPage();
    const html = buildInvoiceHtml(invoice);

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}