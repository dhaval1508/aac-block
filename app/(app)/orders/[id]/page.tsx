import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrderDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  if (session.role === "ADMIN") redirect(`/admin/orders/${id}`);
  if (session.role === "STOCKER") redirect(`/stocker/orders/${id}`);
  if (session.role === "STAFF") redirect(`/staff/orders/${id}`);
  redirect(`/customer/orders/${id}`);
}
