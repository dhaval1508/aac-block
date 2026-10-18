import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CustomerOrderForm } from "@/components/customer-order-form";

export const dynamic = "force-dynamic";

export default async function CustomerNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; productId?: string }>;
}) {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN"].includes(session.role)) redirect("/login");

  const { error, productId } = await searchParams;

  const [rawProducts, user] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { widthMm: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: session.id },
      select: { deliveryAddress: true, billingAddress: true },
    }),
  ]);

  const products = rawProducts.map((p) => ({
    id: p.id,
    sizeLabel: p.sizeLabel,
    dimensions: p.dimensions,
    cbmPerBlock: Number(p.cbmPerBlock),
    blocksPerCbm: Number(p.blocksPerCbm),
    price: Number(p.price),
    gstRate: Number(p.gstRate),
  }));

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-navy">Place New AAC Block Order</h1>
        <p className="text-sm text-slate-500">
          Select required block dimensions and quantity. Volume (CBM) and vehicle payload staging calculate automatically.
        </p>
      </div>

      <CustomerOrderForm
        products={products}
        defaultAddress={user?.deliveryAddress ?? ""}
        defaultProductId={productId}
        error={error}
      />
    </div>
  );
}
