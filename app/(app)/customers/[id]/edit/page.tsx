import { redirect } from "next/navigation";

export default function CustomerEditRedirectPage() {
  redirect("/admin/users");
}
