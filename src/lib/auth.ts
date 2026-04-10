import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { checkRateLimit } from "./ratelimit";

export function getAuthOptions(): NextAuthOptions {
  // Lazy imports so Prisma/adapter are not evaluated at build time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaAdapter } = require("@next-auth/prisma-adapter");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { prisma } = require("./prisma");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require("resend");

  const resend = new Resend(process.env.RESEND_API_KEY);

  return {
    secret: process.env.NEXTAUTH_SECRET,
    adapter: PrismaAdapter(prisma),
    providers: [
      EmailProvider({
        from: "Invoicely <onboarding@resend.dev>",
        sendVerificationRequest: async ({ identifier: email, url }) => {
          const { allowed, retryAfterSec } = checkRateLimit(`login:${email}`);
          if (!allowed) {
            throw new Error(`Prea multe cereri. Încearcă din nou în ${retryAfterSec} secunde.`);
          }
          await resend.emails.send({
            from: "Invoicely <onboarding@resend.dev>",
            to: email,
            subject: "Autentificare Invoicely",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #1e293b; margin-bottom: 8px;">Bun venit la Invoicely</h2>
                <p style="color: #475569; margin-bottom: 16px;">Copiază și deschide link-ul de mai jos în browser pentru a te autentifica. Link-ul expiră în 24 de ore.</p>
                <p style="word-break:break-all;background:#f1f5f9;padding:14px;border-radius:8px;font-size:13px;color:#2563eb;margin-bottom:16px">${url}</p>
                <p style="color:#94a3b8;font-size:12px;">
                  Dacă nu ai solicitat acest email, îl poți ignora în siguranță.
                </p>
              </div>
            `,
          });
        },
      }),
    ],
    pages: {
      signIn: "/login",
      verifyRequest: "/login?verify=1",
      error: "/login?error=1",
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) token.id = user.id;
        return token;
      },
      async session({ session, token }) {
        if (session.user && token.id) {
          session.user.id = token.id as string;
        }
        return session;
      },
    },
    session: {
      strategy: "jwt",
    },
  };
}

export const authOptions: NextAuthOptions = getAuthOptions();