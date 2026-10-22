import { redirect } from "next/navigation";

export default async function SalesmanNewOrderRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) q.set(k, v);
  });
  const queryString = q.toString();
  redirect(queryString ? `/salesman/orders/new?${queryString}` : "/salesman/orders/new");
}
