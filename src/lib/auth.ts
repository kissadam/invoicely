import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login?error=1",
  },
  callbacks: {
    async jwt({ token, account }) {
      // On first sign-in, upsert the user into the database
      if (account) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { prisma } = require("./prisma");
        const dbUser = await prisma.user.upsert({
          where: { email: token.email! },
          create: {
            email: token.email!,
            name: token.name ?? null,
            image: token.picture ?? null,
          },
          update: {
            name: token.name ?? null,
            image: token.picture ?? null,
          },
        });
        token.id = dbUser.id;
      }
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