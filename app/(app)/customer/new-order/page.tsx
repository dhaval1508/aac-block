import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCompanyProfile } from "@/lib/company-profile";
import { CustomerOrderForm, type ProductItem } from "@/components/customer-order-form";
import { BrochureDownloadButton } from "@/components/brochure-download-btn";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    productId?: string;
    quantity?: string;
    adhesiveBags?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN", "SALESMAN"].includes(session.role)) redirect("/login");

  const { error, productId, quantity, adhesiveBags } = await searchParams;

  const [rawProducts, user, companyProfile] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { widthMm: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: session.id },
      select: {
        name: true,
        companyName: true,
        mobile: true,
        email: true,
        deliveryAddress: true,
        billingAddress: true,
        city: true,
        pincode: true,
        gstin: true,
      },
    }),
    getCompanyProfile(),
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
  const adhesiveProduct =
    allProducts.find(
      (p) =>
        p.category === "MORTAR" ||
        p.category === "ADHESIVE" ||
        p.category === "BLOCK_JOINTING_MORTAR" ||
        p.name.includes("Mortar") ||
        p.name.includes("Morter")
    ) || null;

  const defaultQty = quantity ? parseInt(quantity, 10) : undefined;
  const defaultAdhesive = adhesiveBags ? parseInt(adhesiveBags, 10) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/customer/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
              Place AAC Block Order
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Select AAC block sizes, quantities, and Block Jointing Morter (40 KG Bags).
            </p>
          </div>
        </div>
      </div>

      {/* Brochure Download Banner */}
      <BrochureDownloadButton variant="card" />

      {/* Main Order Form */}
      <CustomerOrderForm
        aacProducts={aacProducts}
        adhesiveProduct={adhesiveProduct}
        companyProfile={companyProfile}
        customerDefaults={{
          name: session.role === "ADMIN" ? "" : (user?.companyName || user?.name || session.name || ""),
          mobile: session.role === "ADMIN" ? "" : (user?.mobile || ""),
          email: session.role === "ADMIN" ? "" : (user?.email || ""),
          deliveryAddress: (session.role === "ADMIN" || user?.deliveryAddress?.includes("Swarnim AAC Block Yard")) ? "" : (user?.deliveryAddress || ""),
          city: session.role === "ADMIN" ? "Ahmedabad" : (user?.city || ""),
          pincode: session.role === "ADMIN" ? "" : (user?.pincode || ""),
          gstin: session.role === "ADMIN" ? "" : (user?.gstin || ""),
          companyName: session.role === "ADMIN" ? "" : (user?.companyName || user?.name || ""),
        }}
        defaultProductId={productId}
        defaultQuantity={defaultQty}
        defaultAdhesiveBags={defaultAdhesive}
        error={error}
      />
    </div>
  );
}
