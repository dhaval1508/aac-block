import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TaxInvoiceView } from "@/components/tax-invoice";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      product: true,
      transport: true,
      weighbridgeSlip: true,
    },
  });

  if (!order || (!order.invoiceNo && !order.dcNumber)) notFound();

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

  return <TaxInvoiceView order={serializedOrder} />;
}

