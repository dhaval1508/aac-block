import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CustomerOrderForm, type ProductItem } from "@/components/customer-order-form";
import { BrochureDownloadButton } from "@/components/brochure-download-btn";
import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    productId?: string;
    quantity?: string;
    mortarBags?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN"].includes(session.role)) redirect("/login");

  const { error, productId, quantity, mortarBags } = await searchParams;

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

  const allProducts: ProductItem[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    brand: p.brand,
    sizeLabel: p.sizeLabel,
    dimensions: p.dimensions,
    cbmPerBlock: Number(p.cbmPerBlock),
    blocksPerCbm: Number(p.blocksPerCbm),
    price: Number(p.price),
    gstRate: Number(p.gstRate),
    bagWeightKg: p.bagWeightKg ? Number(p.bagWeightKg) : null,
    coverageSqft: p.coverageSqft ? Number(p.coverageSqft) : null,
  }));

  const aacProducts = allProducts.filter((p) => p.category === "AAC_BLOCK");
  const mortarProduct = allProducts.find((p) => p.category === "MORTAR") || null;
  const adhesiveProduct = allProducts.find((p) => p.category === "ADHESIVE") || null;

  const defaultQty = quantity ? parseInt(quantity, 10) : undefined;
  const defaultMortar = mortarBags ? parseInt(mortarBags, 10) : undefined;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/customer/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
              Place Factory Consignment Order
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Select AAC block dimensions, verified thin-bed mortar, and tile adhesive.
            </p>
          </div>
        </div>

        <Link
          href="/customer/dashboard#calculator"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#13789B]/30 bg-teal-50 px-3.5 py-2 text-xs font-bold text-[#13789B] hover:bg-teal-100 transition-colors self-start sm:self-auto"
        >
          <Calculator className="h-3.5 w-3.5" />
          <span>Open AAC Calculator</span>
        </Link>
      </div>

      {/* Brochure Download Banner */}
      <BrochureDownloadButton variant="card" />

      {/* Main Order Form */}
      <CustomerOrderForm
        aacProducts={aacProducts}
        mortarProduct={mortarProduct}
        adhesiveProduct={adhesiveProduct}
        defaultAddress={user?.deliveryAddress ?? ""}
        defaultProductId={productId}
        defaultQuantity={defaultQty}
        defaultMortarBags={defaultMortar}
        error={error}
      />
    </div>
  );
}
