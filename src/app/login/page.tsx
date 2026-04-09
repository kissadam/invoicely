"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isVerify = params.get("verify") === "1";
  const isError  = params.get("error")  === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await signIn("email", { email: email.trim(), callbackUrl: "/" });
    setLoading(false);
  }

  if (isVerify) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 w-full max-w-sm text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-green-600" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Verifică emailul</h1>
        <p className="text-sm text-slate-500">
          Am trimis un link de autentificare la adresa ta. Apasă link-ul pentru a te conecta.
        </p>
        <p className="text-xs text-slate-400 mt-4">Link-ul expiră în 24 de ore.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">I</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Invoicely</h1>
        <p className="text-sm text-slate-500 mt-1">Autentifică-te cu emailul tău</p>
      </div>

      {isError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-sm text-red-700">
          <AlertCircle size={15} />
          Link invalid sau expirat. Încearcă din nou.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            Adresă email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nume@firma.ro"
            required
            autoFocus
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
          Trimite link de autentificare
        </button>
      </form>

      <p className="text-xs text-slate-400 text-center mt-6">
        Vei primi un email cu un link. Nu este necesară o parolă.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="w-full max-w-sm h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}