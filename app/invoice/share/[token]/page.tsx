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
    },
  });

  if (!order || !order.invoiceNo) notFound();

  const serializedOrder = {
    ...order,
    rate: Number(order.rate),
    gstRate: Number(order.gstRate),
    subtotal: Number(order.subtotal),
    gstAmount: Number(order.gstAmount),
    totalAmount: Number(order.totalAmount),
    paidAmount: Number(order.paidAmount),
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

