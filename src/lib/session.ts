/**
 * Session helpers for API routes and server components.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

/**
 * For API routes — returns userId or a 401 response.
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
 * For server components — returns userId or redirects.
 * By default also enforces Terms acceptance (skipTerms to bypass).
 */
export async function requirePageSession(opts?: { skipTerms?: boolean }): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  if (!opts?.skipTerms) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { termsAcceptedAt: true },
    });
    if (!user?.termsAcceptedAt) redirect("/accept-terms");
  }

  return session.user.id;
}