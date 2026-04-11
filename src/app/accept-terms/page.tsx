export const dynamic = "force-dynamic";

import { requirePageSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AcceptTermsClient from "./AcceptTermsClient";

export default async function AcceptTermsPage() {
  const userId = await requirePageSession({ skipTerms: true });

  // Already accepted — send to dashboard
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { termsAcceptedAt: true },
  });
  if (user?.termsAcceptedAt) redirect("/");

  return <AcceptTermsClient />;
}