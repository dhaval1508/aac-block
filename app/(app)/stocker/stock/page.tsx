import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getStockBySize } from "@/lib/data";
import { StockManager } from "@/components/stock-manager";

export const dynamic = "force-dynamic";

export default async function StockerStockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session || !["ADMIN", "STOCKER"].includes(session.role)) redirect("/login");

  const { error } = await searchParams;

  const [products, movements] = await Promise.all([
    getStockBySize(),
    prisma.stockMovement.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { sizeLabel: true } },
        order: { select: { id: true, orderNo: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="p-4 sm:p-6">
      <StockManager
        products={products}
        movements={movements}
        role="STOCKER"
        error={error}
      />
    </div>
  );
}
