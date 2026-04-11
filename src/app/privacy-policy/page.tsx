import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Invoicely",
};

const LAST_UPDATED = "April 2026";
const CONTROLLER_EMAIL = "hello@akvisuals.ro";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Invoicely</Link>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {LAST_UPDATED} · Version 1.0</p>

        <Prose>
          <h2>1. Who We Are</h2>
          <p>
            Invoicely is an invoicing software service operated by AKVisuals (contact: <a href={`mailto:${CONTROLLER_EMAIL}`}>{CONTROLLER_EMAIL}</a>). We act as the data controller for personal data processed through this platform.
          </p>

          <h2>2. Data We Collect</h2>
          <ul>
            <li><strong>Account data:</strong> your name, email address, and profile image obtained via Google OAuth.</li>
            <li><strong>Company data:</strong> CUI (fiscal code), company name, address, bank details (IBAN), and VAT payer status.</li>
            <li><strong>Client data:</strong> client names, CUI codes, addresses, phone numbers, and email addresses you enter.</li>
            <li><strong>Invoice data:</strong> invoice numbers, dates, line items, amounts, currencies, and exchange rates.</li>
            <li><strong>Usage data:</strong> locale preference stored in browser (localStorage + cookie).</li>
          </ul>

          <h2>3. Why We Collect It (Legal Basis)</h2>
          <ul>
            <li><strong>Contract performance (Art. 6(1)(b) GDPR):</strong> to provide the invoicing service you signed up for.</li>
            <li><strong>Legal obligation (Art. 6(1)(c) GDPR):</strong> invoices must be retained for 10 years under Romanian accounting law (Legea 82/1991).</li>
            <li><strong>Legitimate interest (Art. 6(1)(f) GDPR):</strong> basic security logging and fraud prevention.</li>
          </ul>

          <h2>4. Data Retention</h2>
          <p>
            Your account data is retained for as long as your account is active. Invoice records are retained for a minimum of <strong>10 years</strong> as required by Romanian fiscal law. When you delete your account, your personal identifiers are anonymised but invoice records are preserved in anonymised form to meet this legal requirement.
          </p>

          <h2>5. Data Sharing</h2>
          <p>We do not sell your data. We share data only with:</p>
          <ul>
            <li><strong>Infrastructure providers:</strong> Vercel (hosting), Supabase/PostgreSQL (database storage) — bound by GDPR-compliant data processing agreements.</li>
            <li><strong>ANAF (Romanian tax authority):</strong> CUI lookups are sent to ANAF public API; no personal data is transmitted beyond the CUI number.</li>
            <li><strong>BNR (Romanian National Bank):</strong> exchange rate data only (no personal data).</li>
          </ul>

          <h2>6. Your Rights Under GDPR</h2>
          <ul>
            <li><strong>Access (Art. 15):</strong> request a copy of your data via Settings → Export My Data.</li>
            <li><strong>Rectification (Art. 16):</strong> correct your data directly within the app.</li>
            <li><strong>Erasure (Art. 17):</strong> delete your account via Settings → Delete Account. Note: invoice records are retained per legal obligation.</li>
            <li><strong>Portability (Art. 20):</strong> export all your data as JSON via Settings → Export My Data.</li>
            <li><strong>Objection (Art. 21):</strong> contact us at <a href={`mailto:${CONTROLLER_EMAIL}`}>{CONTROLLER_EMAIL}</a>.</li>
          </ul>

          <h2>7. Cookies & Local Storage</h2>
          <p>
            We store a single <code>locale</code> cookie and localStorage entry to remember your language preference. No tracking or advertising cookies are used.
          </p>

          <h2>8. Security</h2>
          <p>
            Data is stored in encrypted PostgreSQL databases. Authentication is handled exclusively via Google OAuth — we never store passwords. API endpoints are rate-limited and require authentication.
          </p>

          <h2>9. Contact & Complaints</h2>
          <p>
            For privacy requests: <a href={`mailto:${CONTROLLER_EMAIL}`}>{CONTROLLER_EMAIL}</a>.
            You also have the right to lodge a complaint with the Romanian data protection authority (ANSPDCP) at <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">www.dataprotection.ro</a>.
          </p>
        </Prose>
      </div>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose prose-slate prose-sm max-w-none
      [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-3
      [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-3
      [&_ul]:text-slate-600 [&_ul]:space-y-1.5 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5
      [&_a]:text-blue-600 [&_a]:hover:underline
      [&_strong]:text-slate-800
      [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs">
      {children}
    </div>
  );
}