import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TaxInvoiceView } from "@/components/tax-invoice";

export const dynamic = "force-dynamic";

export default async function PublicInvoiceSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token) notFound();

  const order = await prisma.order.findUnique({
    where: { shareToken: token },
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
  });

  if (!order || (!order.invoiceNo && !order.dcNumber)) notFound();

  const serializedOrder = {
    ...order,
    rate: Number(order.rate),
    gstRate: Number(order.gstRate),
    subtotal: Number(order.subtotal),
    gstAmount: Number(order.gstAmount),
    totalAmount: Number(order.totalAmount),
    paidAmount: Number(order.paidAmount),
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

  return <TaxInvoiceView order={serializedOrder} isPublic={true} />;
}

