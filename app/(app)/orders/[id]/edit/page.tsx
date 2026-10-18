import { redirect } from "next/navigation";

export default async function OrderEditRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/orders/${id}`);
}
