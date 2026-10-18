import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const pendingCount = await prisma.order.count({ where: { status: "PENDING" } });

  return (
    <AppShell user={session} pendingCount={pendingCount}>
      {children}
    </AppShell>
  );
}
