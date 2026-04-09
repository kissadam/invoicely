import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Resend } from "resend";
import { prisma } from "./prisma";
import { checkRateLimit } from "./ratelimit";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
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
              <p style="color: #475569; margin-bottom: 24px;">Apasă butonul de mai jos pentru a te autentifica. Link-ul expiră în 24 de ore.</p>
              <a href="${url}"
                style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                Autentifică-te
              </a>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
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