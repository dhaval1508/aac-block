import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CustomersRedirectPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "ADMIN") redirect("/admin/users");
  redirect("/");
}
