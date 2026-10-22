import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, ShoppingCart } from "lucide-react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  CustomerOrderForm,
  type ProductItem,
  type AssignedCustomerOption,
} from "@/components/customer-order-form";
import { BrochureDownloadButton } from "@/components/brochure-download-btn";

export const dynamic = "force-dynamic";

export default async function SalesmanNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    customer?: string;
    productId?: string;
    quantity?: string;
    adhesiveBags?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== Role.SALESMAN && session.role !== Role.ADMIN)) {
    redirect("/login");
  }

  const { error, customer, productId, quantity, adhesiveBags } = await searchParams;

  // 1. Fetch active products
  const rawProducts = await prisma.product.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { widthMm: "asc" },
  });

  // 2. Fetch all customers assigned to this logged-in Salesman
  const rawAssignedCustomers = await prisma.user.findMany({
    where: {
      salesmanId: session.id,
      role: Role.CUSTOMER,
    },
    select: {
      id: true,
      name: true,
      companyName: true,
      mobile: true,
      email: true,
      deliveryAddress: true,
      city: true,
      state: true,
      pincode: true,
    },
    orderBy: { name: "asc" },
  });

  const assignedCustomers: AssignedCustomerOption[] = rawAssignedCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    companyName: c.companyName,
    mobile: c.mobile,
    email: c.email,
    deliveryAddress: c.deliveryAddress,
    city: c.city,
    state: c.state,
    pincode: c.pincode,
  }));

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

  // Selected or first customer defaults
  const selectedCust =
    (customer && assignedCustomers.find((c) => c.id === customer)) ||
    assignedCustomers[0] ||
    null;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/salesman/orders"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            aria-label="Back to Customer Orders"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[#13789B]/10 px-2 py-0.5 text-[11px] font-bold text-[#13789B] uppercase tracking-wider">
                Salesman Order Portal
              </span>
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-black text-navy tracking-tight">
              Create Order for Customer
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Submit an AAC block consignment on behalf of your assigned customer using official factory specs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/salesman/customers/new"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <UserPlus className="h-3.5 w-3.5 text-[#13789B]" />
            <span>Manage Customers</span>
          </Link>
        </div>
      </div>

      {/* Brochure Download Banner */}
      <BrochureDownloadButton variant="card" />

      {/* Main Order Form Reusing Exact Customer Form */}
      <CustomerOrderForm
        aacProducts={aacProducts}
        adhesiveProduct={adhesiveProduct}
        customerDefaults={{
          name: selectedCust ? selectedCust.companyName || selectedCust.name : "",
          mobile: selectedCust?.mobile || "",
          email: selectedCust?.email || "",
          deliveryAddress: selectedCust?.deliveryAddress || "",
          city: selectedCust?.city || "Ahmedabad",
          pincode: selectedCust?.pincode || "",
        }}
        defaultProductId={productId}
        defaultQuantity={defaultQty}
        defaultAdhesiveBags={defaultAdhesive}
        isSalesmanMode={true}
        assignedCustomers={assignedCustomers}
        salesmanName={session.name}
        selectedCustomerId={customer}
        error={error}
      />
    </div>
  );
}
