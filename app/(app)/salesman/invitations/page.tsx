import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SalesmanInvitationsView, InvitationItem } from "@/components/salesman-invitations-view";

export const dynamic = "force-dynamic";

export default async function SalesmanInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; success?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== Role.SALESMAN && session.role !== Role.ADMIN)) {
    redirect("/login");
  }

  const { token, error, success } = await searchParams;

  const invitationsData = await prisma.customerInvitation.findMany({
    where: { salesmanId: session.id },
    orderBy: { createdAt: "desc" },
  });

  const invitations: InvitationItem[] = invitationsData.map((inv) => ({
    id: inv.id,
    customerName: inv.customerName,
    mobile: inv.mobile,
    token: inv.token,
    status: inv.status as any,
    expiresAt: inv.expiresAt,
    acceptedAt: inv.acceptedAt,
    createdAt: inv.createdAt,
  }));

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-6">
      <SalesmanInvitationsView
        salesmanName={session.name}
        invitations={invitations}
        currentToken={token}
        appBaseUrl={appBaseUrl}
        error={error}
        success={success}
      />
    </div>
  );
}
