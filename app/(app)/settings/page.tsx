import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsRedirectPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "ADMIN") redirect("/admin/users");
  if (session.role === "CUSTOMER") redirect("/customer/profile");
  redirect("/");
}
