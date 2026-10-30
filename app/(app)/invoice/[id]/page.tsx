import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TaxInvoiceView } from "@/components/tax-invoice";
import { getCompanyProfile } from "@/lib/company-profile";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const [order, companyProfile] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        transport: true,
        weighbridgeSlip: true,
        items: {
          include: { product: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    getCompanyProfile(),
  ]);

  if (!order || !order.customer || (!order.invoiceNo && !order.dcNumber)) notFound();

  // Guard: Customer can only view their own delivery challan; Salesman can only view their assigned customer's challan
  if (session.role === "CUSTOMER" && order.customerId !== session.id) {
    notFound();
  }
  if (session.role === "SALESMAN" && order.salesmanId !== session.id && order.customer?.salesmanId !== session.id) {
    notFound();
  }

  const serializedOrder = {
    ...order,
    rate: Number(order.rate),
    gstRate: Number(order.gstRate),
    subtotal: Number(order.subtotal),
    gstAmount: Number(order.gstAmount),
    totalAmount: Number(order.totalAmount),
    paidAmount: Number(order.paidAmount),
    totalCbm: order.totalCbm ? Number(order.totalCbm) : null,
    loadedCbm: order.loadedCbm ? Number(order.loadedCbm) : null,
    totalSqft: order.totalSqft ? Number(order.totalSqft) : null,
    pricePerCbm: order.pricePerCbm ? Number(order.pricePerCbm) : null,
    latitude: order.latitude ? Number(order.latitude) : null,
    longitude: order.longitude ? Number(order.longitude) : null,
    customer: order.customer
      ? {
          ...order.customer,
        }
      : null,
    items: order.items.map((it) => ({
      id: it.id,
      productName: it.productName,
      sizeLabel: it.sizeLabel,
      dimensions: it.dimensions,
      quantity: it.quantity,
      loadedQuantity: it.loadedQuantity,
      cbmPerUnit: it.cbmPerUnit ? Number(it.cbmPerUnit) : null,
      totalCbm: it.totalCbm ? Number(it.totalCbm) : null,
      productType: it.productType,
      product: it.product
        ? {
            name: it.product.name,
            sizeLabel: it.product.sizeLabel,
            dimensions: it.product.dimensions,
            category: it.product.category,
            cbmPerBlock: Number(it.product.cbmPerBlock),
          }
        : null,
    })),
    product: order.product
      ? {
          ...order.product,
          price: Number(order.product.price),
          gstRate: Number(order.product.gstRate),
          cbmPerBlock: Number(order.product.cbmPerBlock),
          blocksPerCbm: Number(order.product.blocksPerCbm),
        }
      : null,
    weighbridgeSlip: order.weighbridgeSlip
      ? {
          rstNumber: order.weighbridgeSlip.rstNumber,
          netWeightKg: Number(order.weighbridgeSlip.netWeightKg),
          weighbridgeName: order.weighbridgeSlip.weighbridgeName,
          vehicleNumber: order.weighbridgeSlip.vehicleNumber,
        }
      : null,
  };

  return <TaxInvoiceView order={serializedOrder} companyProfile={companyProfile} />;
}

