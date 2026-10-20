import { OrderStatus, Role, StockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getStockSummary() {
  const result = await prisma.stockMovement.aggregate({
    _sum: { quantityDelta: true },
  });
  const current = result._sum.quantityDelta ?? 0;

  const [stockInSum, stockOutSum] = await Promise.all([
    prisma.stockMovement.aggregate({
      where: { type: StockType.IN },
      _sum: { quantityDelta: true },
    }),
    prisma.stockMovement.aggregate({
      where: { type: StockType.OUT },
      _sum: { quantityDelta: true },
    }),
  ]);

  return {
    stockIn: stockInSum._sum.quantityDelta ?? 0,
    stockOut: Math.abs(stockOutSum._sum.quantityDelta ?? 0),
    current,
  };
}

export async function getStockBySize() {
  const products = await prisma.product.findMany({
    where: {
      category: "AAC_BLOCK",
      deletedAt: null,
    },
    orderBy: { widthMm: "asc" },
    include: {
      movements: {
        select: { quantityDelta: true },
      },
    },
  });

  return products.map((p) => {
    const currentStock = p.movements.reduce((acc, m) => acc + m.quantityDelta, 0);
    return {
      ...p,
      price: Number(p.price),
      gstRate: Number(p.gstRate),
      cbmPerBlock: Number(p.cbmPerBlock),
      blocksPerCbm: Number(p.blocksPerCbm),
      currentStock,
    };
  });
}

export async function getMortarStock() {
  const mortar = await prisma.product.findFirst({
    where: {
      category: "MORTAR",
      deletedAt: null,
      active: true,
    },
    include: {
      movements: {
        select: { quantityDelta: true },
      },
    },
  });

  if (!mortar) return { name: "Block Jointing Morter", sizeLabel: "40 KG Bag", stock: 0 };
  const stock = mortar.movements.reduce((acc, m) => acc + m.quantityDelta, 0);
  return {
    id: mortar.id,
    name: mortar.name,
    sizeLabel: mortar.sizeLabel,
    stock,
  };
}

export async function getAdminDashboardStats() {
  const [stock, pendingOrders, totalCustomers, activeOrders, allOrders] = await Promise.all([
    getStockSummary(),
    prisma.order.count({ where: { status: OrderStatus.PENDING } }),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
    prisma.order.count({
      where: {
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.ASSIGNED,
            OrderStatus.LOADING,
            OrderStatus.LOADED,
            OrderStatus.DISPATCHED,
          ],
        },
      },
    }),
    prisma.order.findMany({
      select: { totalAmount: true, paidAmount: true },
    }),
  ]);

  const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalReceived = allOrders.reduce((sum, o) => sum + Number(o.paidAmount), 0);
  const totalOutstanding = Math.max(0, totalRevenue - totalReceived);

  return {
    ...stock,
    pendingOrders,
    activeOrders,
    totalCustomers,
    totalRevenue,
    totalReceived,
    totalOutstanding,
  };
}

export async function getRecentOrders(take = 5) {
  const orders = await prisma.order.findMany({
    take,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      product: true,
      transport: true,
    },
  });

  return orders.map((o) => ({
    ...o,
    rate: Number(o.rate),
    gstRate: Number(o.gstRate),
    subtotal: Number(o.subtotal),
    gstAmount: Number(o.gstAmount),
    totalAmount: Number(o.totalAmount),
    paidAmount: Number(o.paidAmount),
    product: o.product
      ? {
          ...o.product,
          price: Number(o.product.price),
          gstRate: Number(o.product.gstRate),
          cbmPerBlock: Number(o.product.cbmPerBlock),
          blocksPerCbm: Number(o.product.blocksPerCbm),
        }
      : null,
  }));
}

