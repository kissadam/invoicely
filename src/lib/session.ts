/**
 * Session helpers for API routes and server components.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

/**
 * For API routes — returns userId only (lightweight, no extra DB query).
 */
export async function requireUserId(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Autentificare necesară" }, { status: 401 }),
    };
  }
  return { userId: session.user.id, error: null };
}

/**
 * For API routes that need company scope + plan limits.
 * Returns userId, activeCompanyId, and subscription plan in one DB query.
 */
export async function requireActiveCompany(): Promise<
  | { userId: string; companyId: string; plan: string; error: null }
  | { userId: null; companyId: null; plan: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      userId: null, companyId: null, plan: null,
      error: NextResponse.json({ error: "Autentificare necesară" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      activeCompanyId: true,
      subscription: { select: { plan: true, status: true } },
    },
  });

  if (!user?.activeCompanyId) {
    return {
      userId: null, companyId: null, plan: null,
      error: NextResponse.json({ error: "Nicio companie activă" }, { status: 422 }),
    };
  }

  const plan = user.subscription?.plan ?? "free";
  return { userId: session.user.id, companyId: user.activeCompanyId, plan, error: null };
}

/**
 * For server components — returns userId + activeCompanyId, redirects if unauthenticated.
 * By default also enforces Terms acceptance (skipTerms to bypass).
 */
export async function requirePageSession(opts?: {
  skipTerms?: boolean;
}): Promise<{ userId: string; companyId: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { termsAcceptedAt: true, activeCompanyId: true },
  });

  if (!opts?.skipTerms && !user?.termsAcceptedAt) redirect("/accept-terms");

  return { userId: session.user.id, companyId: user?.activeCompanyId ?? null };
}