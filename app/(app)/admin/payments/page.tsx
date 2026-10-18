import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  // User-facing access to monetary ledger is removed as per operational ERP requirement
  redirect("/admin/orders");
}
