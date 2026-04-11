import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";

export async function POST() {
  const { error } = await requireUserId();
  if (error) return error;

  // Stripe Customer Portal — coming in Fragment 4
  return NextResponse.json(
    { error: "Billing portal coming soon." },
    { status: 501 }
  );
}