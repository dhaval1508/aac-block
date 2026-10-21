import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getStockBySize, getMortarStock } from "@/lib/data";
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

  const [products, mortarStock, movements] = await Promise.all([
    getStockBySize(),
    getMortarStock(),
    prisma.stockMovement.findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            sizeLabel: true,
            dimensions: true,
            bagWeightKg: true,
            cbmPerBlock: true,
          },
        },
        order: { select: { id: true, orderNo: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  const serializedMovements = movements.map((m) => ({
    id: m.id,
    type: m.type,
    quantityDelta: m.quantityDelta,
    cbmDelta: m.cbmDelta != null ? Number(m.cbmDelta) : null,
    referenceNo: m.referenceNo,
    note: m.note,
    purchasePrice: m.purchasePrice ? Number(m.purchasePrice) : null,
    sellingPrice: m.sellingPrice ? Number(m.sellingPrice) : null,
    supplier: m.supplier,
    entryDate: m.entryDate ? m.entryDate.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt ? m.updatedAt.toISOString() : null,
    product: {
      id: m.product.id,
      name: m.product.name,
      category: m.product.category,
      sizeLabel: m.product.sizeLabel,
      dimensions: m.product.dimensions,
      bagWeightKg: m.product.bagWeightKg ? Number(m.product.bagWeightKg) : null,
      cbmPerBlock: m.product.cbmPerBlock ? Number(m.product.cbmPerBlock) : 0,
    },
    order: m.order ? { id: m.order.id, orderNo: m.order.orderNo } : null,
    createdBy: m.createdBy ? { name: m.createdBy.name } : null,
  }));

  return (
    <div className="p-4 sm:p-6">
      <StockManager
        products={products}
        mortarStock={mortarStock}
        movements={serializedMovements}
        role="STOCKER"
        error={error}
      />
    </div>
  );
}
