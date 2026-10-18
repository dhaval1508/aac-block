import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TransportDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "ADMIN") redirect("/admin/orders");
  if (session.role === "STOCKER") redirect("/stocker/orders");
  if (session.role === "STAFF") redirect("/staff/dashboard");
  redirect("/customer/orders");
}
