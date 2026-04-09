/**
 * Session helpers for API routes and server components.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

/**
 * For API routes — returns userId or a 401 response.
 * Usage: const { userId, error } = await requireUserId();
 *        if (error) return error;
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
 * For server components — returns userId or redirects to /login.
 */
export async function requirePageSession(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}