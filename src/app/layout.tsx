import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import AppShell from "@/components/layout/AppShell";
import Providers from "@/components/layout/Providers";

export const metadata: Metadata = {
  title: "Invoicely — Facturare România",
  description: "Sistem de facturare pentru firme din România. Integrare ANAF, curs BNR, generare PDF.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: { fontFamily: "Inter, sans-serif", fontSize: "14px" },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}