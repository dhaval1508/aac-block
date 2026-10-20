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
    },
  });

  if (!order || !order.invoiceNo) notFound();

  // Guard: Customer can only view their own invoice; Stocker and Staff are blocked from financial invoices
  if (session.role === "CUSTOMER" && order.customerId !== session.id) {
    notFound();
  }
  if (["STAFF", "STOCKER"].includes(session.role)) {
    redirect("/login");
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
  };

  return <TaxInvoiceView order={serializedOrder} />;
}

