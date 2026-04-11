import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions — Invoicely",
};

const LAST_UPDATED = "April 2026";
const CONTACT_EMAIL = "hello@akvisuals.ro";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Invoicely</Link>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms & Conditions</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {LAST_UPDATED} · Version 1.0</p>

        <Prose>
          <h2>1. The Service</h2>
          <p>
            Invoicely is a software tool that assists users in generating and managing invoices. It is provided by AKVisuals (<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>).
          </p>

          <h2>2. Important Disclaimer — Not an Accounting Authority</h2>
          <p className="font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            ⚠️ Invoicely is a software tool, not an accounting firm, tax advisor, or fiscal authority. The invoices generated are your legal responsibility. You must ensure that all invoices comply with applicable Romanian and EU fiscal regulations.
          </p>
          <p>
            We make no warranty that invoices generated through this platform are compliant with all applicable laws. Tax law changes frequently and you are responsible for staying current.
          </p>

          <h2>3. User Responsibilities</h2>
          <ul>
            <li>You are solely responsible for the fiscal and legal correctness of invoices you generate.</li>
            <li>You are responsible for submitting invoices to fiscal authorities (ANAF, e-Factura) as required by law.</li>
            <li>You must verify VAT rates, fiscal codes, and other regulatory fields before issuing invoices.</li>
            <li>You must maintain copies of invoices as required by Romanian accounting law.</li>
            <li>You must not use this service for fraudulent, illegal, or misleading invoicing.</li>
          </ul>

          <h2>4. No Liability for Tax Errors</h2>
          <p>
            AKVisuals shall not be liable for any tax penalties, fines, audit findings, or legal consequences arising from incorrect or incomplete invoices generated using this service. This includes but is not limited to errors in VAT rates, fiscal codes, invoice numbering, or regulatory format requirements.
          </p>

          <h2>5. Service Provided "As-Is"</h2>
          <p>
            The service is provided "as-is" and "as-available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or meet your specific requirements. We reserve the right to modify, suspend, or discontinue the service at any time.
          </p>

          <h2>6. Data & Privacy</h2>
          <p>
            Your use of this service is also governed by our <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>, which is incorporated into these Terms. By accepting these Terms you also accept the Privacy Policy.
          </p>

          <h2>7. Data Retention</h2>
          <p>
            Invoice data is retained for a minimum of 10 years as required by Romanian accounting law (Legea 82/1991). By using this service you acknowledge and accept this retention period.
          </p>

          <h2>8. Account Termination</h2>
          <p>
            You may delete your account at any time via Settings. Upon deletion, your personal data is anonymised. Invoice records are retained in anonymised form for the legally required period.
            We reserve the right to suspend or terminate accounts that violate these Terms.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            These Terms are governed by Romanian law. Any disputes shall be resolved in the competent courts of Romania.
          </p>

          <h2>10. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. When we do, we will update the version number and date above and may notify you within the application. Continued use of the service after changes constitutes acceptance of the new Terms.
          </p>

          <h2>11. Contact</h2>
          <p>
            Questions about these Terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
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