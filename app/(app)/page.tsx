import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { roleHome } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RootAppPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  redirect(roleHome(session.role));
}
