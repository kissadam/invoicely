/**
 * Demo user bootstrap — creates the demo user on first use.
 * Replace with real auth (NextAuth/Clerk) when ready.
 */
import { prisma } from "./prisma";

export const DEMO_USER_ID = "demo-user";

export async function ensureDemoUser() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    create: { id: DEMO_USER_ID, email: "demo@invoicely.ro", name: "Demo User" },
    update: {},
  });
}