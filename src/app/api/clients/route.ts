export const dynamic = "force-dynamic";

/**
 * GET  /api/clients  — list clients
 * POST /api/clients  — create client
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const clients = await prisma.client.findMany({
    where: {
      userId,
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" } },
        { cui:  { contains: q, mode: "insensitive" } },
      ]} : {}),
    },
    orderBy: { name: "asc" },
    take: 50,
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "Numele clientului este obligatoriu" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      userId,
      name:     body.name,
      cui:      body.cui      ?? null,
      address:  body.address  ?? null,
      vatPayer: body.vatPayer ?? false,
      currency: body.currency ?? "RON",
      phone:    body.phone    ?? null,
      email:    body.email    ?? null,
      anafData: body.anafData ?? undefined,
    },
  });

  return NextResponse.json(client, { status: 201 });
}