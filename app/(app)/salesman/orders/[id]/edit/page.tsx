import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Role, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCompanyProfile } from "@/lib/company-profile";
import { CustomerOrderForm, ProductItem, BlockOrderItem } from "@/components/customer-order-form";
import { canViewOrderPricing } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalesmanEditOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== Role.SALESMAN && session.role !== Role.ADMIN)) {
    redirect("/login");
  }

  const { id } = await params;
  const { error } = await searchParams;

  const [order, companyProfile] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        product: true,
      },
    }),
    getCompanyProfile(),
  ]);

  if (!order) {
    notFound();
  }

  // Strict role permission check: Salesmen can only edit orders of their assigned customers!
  if (session.role === Role.SALESMAN && order.salesmanId !== session.id) {
    redirect("/salesman/orders?error=Unauthorized%20access%20to%20order");
  }

  const canViewPricing = canViewOrderPricing(session, order);

  // Strict Dispatch Lockout Check
  const lockedStatuses: OrderStatus[] = [
    OrderStatus.DISPATCHED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REJECTED,
  ];

  if (lockedStatuses.includes(order.status)) {
    redirect(
      `/salesman/orders/${id}?error=This%20order%20has%20already%20been%20dispatched%20and%20can%20no%20longer%20be%20edited.`
    );
  }

  // Fetch all 9 active AAC block sizes
  const rawAacProducts = await prisma.product.findMany({
    where: {
      category: "AAC_BLOCK",
      active: true,
      deletedAt: null,
    },
    orderBy: { widthMm: "asc" },
  });

  const aacProducts: ProductItem[] = rawAacProducts.map((p) => ({
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

  const rawAdhesive = await prisma.product.findFirst({
    where: {
      category: { in: ["MORTAR", "ADHESIVE", "BLOCK_JOINTING_MORTAR"] },
      active: true,
      deletedAt: null,
    },
  });

  const adhesiveProduct: ProductItem | null = rawAdhesive
    ? {
        id: rawAdhesive.id,
        name: rawAdhesive.name,
        category: rawAdhesive.category,
        brand: rawAdhesive.brand,
        sizeLabel: rawAdhesive.sizeLabel,
        dimensions: rawAdhesive.dimensions,
        cbmPerBlock: Number(rawAdhesive.cbmPerBlock || 0),
        blocksPerCbm: Number(rawAdhesive.blocksPerCbm || 0),
        price: Number(rawAdhesive.price),
        gstRate: Number(rawAdhesive.gstRate),
      }
    : null;

  // Build initial block items from order items
  const blockOrderItems: BlockOrderItem[] = [];
  if (order.items && order.items.length > 0) {
    const aacLineItems = order.items.filter((it) => it.productType === "AAC_BLOCK");
    for (const it of aacLineItems) {
      blockOrderItems.push({
        id: it.id,
        productId: it.productId,
        cbm: it.totalCbm ? Number(it.totalCbm) : "",
        quantity: it.quantity,
      });
    }
  }

  // Fallback to primary product if items was empty
  if (blockOrderItems.length === 0 && order.productId) {
    blockOrderItems.push({
      id: "legacy-1",
      productId: order.productId,
      cbm: order.totalCbm ? Number(order.totalCbm) : "",
      quantity: order.quantity,
    });
  }

  const initialDeliveryLocation = {
    address: order.formattedAddress || order.deliveryAddress,
    locationSource: (order.locationSource === "GPS" || order.locationSource === "GOOGLE_MAPS_LINK"
      ? order.locationSource
      : "MANUAL") as "GPS" | "GOOGLE_MAPS_LINK" | "MANUAL",
    googleMapsUrl: order.googleMapsUrl || undefined,
    latitude: order.latitude ? Number(order.latitude) : undefined,
    longitude: order.longitude ? Number(order.longitude) : undefined,
    customSiteName: order.customSiteName || undefined,
    villageArea: order.villageArea || undefined,
    city: order.city || "Ahmedabad",
    district: order.district || "Ahmedabad",
    state: order.state || "Gujarat",
    pincode: order.pincode || "",
    nearbyLandmark: order.nearbyLandmark || undefined,
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto min-w-0 max-w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/salesman/orders/${order.id}`}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#13789B]">
                Salesman Order Modification (v{order.version || 1})
              </span>
              <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5">
                Pre-Dispatch Edit Window Open
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight mt-0.5">
              Edit Order {order.orderNo}
            </h1>
            <p className="text-xs text-slate-500">
              Customer: {order.customer.companyName || order.customer.name} ({order.customer.mobile})
            </p>
          </div>
        </div>

        <Link
          href={`/salesman/orders/${order.id}`}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 self-start sm:self-auto"
        >
          Cancel & Return to Order
        </Link>
      </div>

      {/* Safety Notice */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="block font-bold">Audit History Tracking:</strong>
          <span>
            Every edit increments the order version and records your identity ({session.name}), previous and updated quantities, and notifies Factory Super Admin and the customer. Orders cannot be modified once dispatched.
          </span>
        </div>
      </div>

      {/* Main Order Form in Edit Mode */}
      <CustomerOrderForm
        aacProducts={aacProducts}
        adhesiveProduct={adhesiveProduct}
        companyProfile={companyProfile}
        customerDefaults={{
          name: order.customer.companyName || order.customer.name,
          mobile: order.customer.mobile,
          email: order.customer.email || "",
          deliveryAddress: order.deliveryAddress,
          city: order.city || "Ahmedabad",
          pincode: order.pincode || "",
        }}
        isEditing={true}
        orderId={order.id}
        orderNo={order.orderNo}
        initialBlockItems={blockOrderItems}
        initialDeliveryLocation={initialDeliveryLocation}
        initialNotes={order.notes || ""}
        initialGstBillingSelected={order.gstBillingSelected ?? undefined}
        initialGstNumber={order.gstNumber ?? undefined}
        initialGstRegisteredName={order.gstRegisteredName ?? undefined}
        initialGstStatus={order.gstStatus ?? undefined}
        initialPricePerCbm={canViewPricing && order.pricePerCbm ? Number(order.pricePerCbm) : undefined}
        initialPricingRemarks={canViewPricing ? order.pricingRemarks || undefined : undefined}
        defaultAdhesiveBags={order.adhesiveBags ?? 0}
        error={error}
      />
    </div>
  );
}
