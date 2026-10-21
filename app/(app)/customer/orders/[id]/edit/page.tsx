import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit3, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CustomerOrderForm, ProductItem, BlockOrderItem } from "@/components/customer-order-form";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CustomerEditOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      customer: true,
      product: true,
    },
  });

  if (!order || (session.role === "CUSTOMER" && order.customerId !== session.id)) {
    notFound();
  }

  // Strict Dispatch Lockout Check
  const lockedStatuses: OrderStatus[] = [
    OrderStatus.DISPATCHED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REJECTED,
  ];

  if (lockedStatuses.includes(order.status)) {
    redirect(
      `/customer/orders/${id}?error=This%20order%20has%20already%20been%20dispatched%20and%20can%20no%20longer%20be%20edited.`
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

  // Fallback to legacy single product if items was empty
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
    locationSource: (order.locationSource === "GOOGLE_MAPS" ? "GOOGLE_MAPS" : "MANUAL") as
      | "GOOGLE_MAPS"
      | "MANUAL",
    googlePlaceId: order.googlePlaceId || undefined,
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
            href={`/customer/orders/${order.id}`}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#13789B]">
                Order Modification (v{order.version || 1})
              </span>
              <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5">
                Pre-Dispatch Edit Window Open
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight mt-0.5">
              Edit Order {order.orderNo}
            </h1>
          </div>
        </div>

        <Link
          href={`/customer/orders/${order.id}`}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 self-start sm:self-auto"
        >
          Cancel & Return to Order
        </Link>
      </div>

      {/* Advisory Banner */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            Customer Order Modification Notice
          </p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            You can modify block sizes, CBM volume, mortar bags, and delivery destination until physical dispatch from the factory yard. Upon confirmation, factory loading staff and administration are immediately alerted with your revised quantities.
          </p>
        </div>
      </div>

      {/* Reusable Order Form in Edit Mode */}
      <CustomerOrderForm
        aacProducts={aacProducts}
        adhesiveProduct={adhesiveProduct}
        customerDefaults={{
          name: order.customer.name,
          mobile: order.customer.mobile,
          email: order.customer.email,
          deliveryAddress: order.deliveryAddress,
          city: order.city || "Ahmedabad",
          pincode: order.pincode || "",
        }}
        defaultAdhesiveBags={order.adhesiveBags ?? 0}
        isEditing={true}
        orderId={order.id}
        orderNo={order.orderNo}
        initialBlockItems={blockOrderItems}
        initialDeliveryLocation={initialDeliveryLocation}
        initialNotes={order.notes || ""}
        error={error}
      />
    </div>
  );
}
