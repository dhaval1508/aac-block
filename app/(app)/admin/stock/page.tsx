import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getStockBySize } from "@/lib/data";
import { StockManager } from "@/components/stock-manager";
import { resolveDateRange, buildPrismaDateFilter } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    preset?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { error, preset, from, to } = await searchParams;
  const dateRange = resolveDateRange(preset, from, to);
  const dateFilter = buildPrismaDateFilter(dateRange);

  const [products, movements] = await Promise.all([
    getStockBySize(),
    prisma.stockMovement.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      take: 300,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { sizeLabel: true } },
        order: { select: { id: true, orderNo: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <StockManager
        products={products}
        movements={movements}
        role="ADMIN"
        error={error}
        periodLabel={dateRange.label}
      />
    </div>
  );
}
