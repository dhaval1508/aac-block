import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canViewOrderPricing } from "@/lib/utils";
import { getCompanyProfile } from "@/lib/company-profile";
import { renderOrderSummaryHtml } from "@/lib/order-summary-template";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const [order, company] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        salesman: true,
        items: { include: { product: true } },
        transport: true,
        weighbridgeSlip: true,
        loadingRecord: true,
      },
    }),
    getCompanyProfile(),
  ]);

  if (!order) {
    return new NextResponse("Order not found", { status: 404 });
  }

  // Security Guard: Customer can only view their own order
  if (session.role === "CUSTOMER" && order.customerId !== session.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Security Guard: Salesman can only view their assigned customers' orders
  if (session.role === "SALESMAN" && order.salesmanId !== session.id && order.customer?.salesmanId !== session.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const canViewPricing = canViewOrderPricing(session, order);

  const html = renderOrderSummaryHtml({ order, company, canViewPricing });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
