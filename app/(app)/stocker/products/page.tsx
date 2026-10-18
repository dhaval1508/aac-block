import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getStockBySize } from "@/lib/data";
import { ProductsManager } from "@/components/products-manager";

export const dynamic = "force-dynamic";

export default async function StockerProductsPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "STOCKER"].includes(session.role)) redirect("/login");

  const products = await getStockBySize();

  return (
    <div className="p-3 sm:p-6 min-w-0 max-w-full">
      <ProductsManager products={products} role="STOCKER" />
    </div>
  );
}
