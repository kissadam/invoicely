export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/invoices/:id/pdf
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/pdf";
import { requireUserId } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId },
    include: {
      items:    { orderBy: { position: "asc" } },
      client:   true,
      company:  true,
      template: true,
    },
  });
  if (!invoice) return NextResponse.json({ error: "Factura nu a fost găsită" }, { status: 404 });

  try {
    const pdfBuffer = await generateInvoicePdf(invoice);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Eroare generare PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}