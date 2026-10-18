import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewOrderRedirectPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "CUSTOMER") redirect("/customer/new-order");
  redirect("/admin/orders");
}
