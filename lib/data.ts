import { OrderStatus, Role, StockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getStockSummary() {
  const [allMovements, stockInMovements, stockOutMovements] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { product: { category: "AAC_BLOCK" } },
      select: { cbmDelta: true, quantityDelta: true, product: { select: { cbmPerBlock: true } } },
    }),
    prisma.stockMovement.findMany({
      where: { type: StockType.IN, product: { category: "AAC_BLOCK" } },
      select: { cbmDelta: true, quantityDelta: true, product: { select: { cbmPerBlock: true } } },
    }),
    prisma.stockMovement.findMany({
      where: { type: StockType.OUT, product: { category: "AAC_BLOCK" } },
      select: { cbmDelta: true, quantityDelta: true, product: { select: { cbmPerBlock: true } } },
    }),
  ]);

  const sumCbm = (list: typeof allMovements) =>
    list.reduce((acc, m) => {
      if (m.cbmDelta != null && Number(m.cbmDelta) !== 0) return acc + Number(m.cbmDelta);
      const rate = Number(m.product.cbmPerBlock) || 0.018;
      return acc + m.quantityDelta * rate;
    }, 0);

  const sumBlocks = (list: typeof allMovements) =>
    list.reduce((acc, m) => acc + m.quantityDelta, 0);

  const currentCbm = Number(sumCbm(allMovements).toFixed(4));
  const currentBlocks = sumBlocks(allMovements);

  const stockInCbm = Number(sumCbm(stockInMovements).toFixed(4));
  const stockInBlocks = sumBlocks(stockInMovements);

  const stockOutCbm = Number(Math.abs(sumCbm(stockOutMovements)).toFixed(4));
  const stockOutBlocks = Math.abs(sumBlocks(stockOutMovements));

  return {
    current: currentBlocks,
    currentCbm,
    stockIn: stockInBlocks,
    stockInCbm,
    stockOut: stockOutBlocks,
    stockOutCbm,
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
        select: { quantityDelta: true, cbmDelta: true },
      },
    },
  });

  return products.map((p) => {
    const cbmPerBlock = Number(p.cbmPerBlock) || 0.018;
    const currentCbm = p.movements.reduce((acc, m) => {
      if (m.cbmDelta != null && Number(m.cbmDelta) !== 0) {
        return acc + Number(m.cbmDelta);
      }
      return acc + m.quantityDelta * cbmPerBlock;
    }, 0);
    const currentStock = cbmPerBlock > 0 ? Math.round(currentCbm / cbmPerBlock) : 0;

    return {
      ...p,
      price: Number(p.price),
      gstRate: Number(p.gstRate),
      cbmPerBlock,
      blocksPerCbm: Number(p.blocksPerCbm),
      currentCbm: Number(currentCbm.toFixed(4)),
      currentStock,
    };
  });
}

export async function getMortarStock() {
  const mortar = await prisma.product.findFirst({
    where: {
      category: { in: ["MORTAR", "ADHESIVE", "BLOCK_JOINTING_MORTAR"] },
      deletedAt: null,
      active: true,
    },
    include: {
      movements: {
        select: {
          id: true,
          type: true,
          quantityDelta: true,
          purchasePrice: true,
          sellingPrice: true,
          supplier: true,
          entryDate: true,
          createdAt: true,
        },
      },
    },
  });

  if (!mortar) {
    return {
      id: "",
      name: "Block Jointing Mortar (40 KG)",
      category: "MORTAR",
      brand: "Swarnim",
      sizeLabel: "40 KG Bag",
      dimensions: "40 KG Bag Only",
      productType: "High Polymer Modified",
      description:
        "Factory-certified thin-bed jointing mortar engineered for high-strength AAC block wall masonry.",
      bagWeightKg: 40,
      stock: 0,
      totalIn: 0,
      totalOut: 0,
      latestPurchasePrice: 0,
      latestSellingPrice: 0,
      latestSupplier: "",
      totalPurchaseValue: 0,
    };
  }

  const stock = mortar.movements.reduce((acc, m) => acc + m.quantityDelta, 0);
  let totalIn = 0;
  let totalOut = 0;
  for (const m of mortar.movements) {
    if (m.type === "IN") totalIn += m.quantityDelta;
    else totalOut += Math.abs(m.quantityDelta);
  }

  const sortedMovements = [...mortar.movements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latestWithPurchase = sortedMovements.find((m) => m.purchasePrice != null);
  const latestWithSelling = sortedMovements.find((m) => m.sellingPrice != null);
  const latestWithSupplier = sortedMovements.find(
    (m) => m.supplier && m.supplier.trim() !== ""
  );

  const latestPurchasePrice = latestWithPurchase?.purchasePrice
    ? Number(latestWithPurchase.purchasePrice)
    : Number(mortar.price) || 0;
  const latestSellingPrice = latestWithSelling?.sellingPrice
    ? Number(latestWithSelling.sellingPrice)
    : 0;
  const latestSupplier = latestWithSupplier?.supplier || "Swarnim Plant";
  const totalPurchaseValue = stock * latestPurchasePrice;

  return {
    id: mortar.id,
    name: mortar.name,
    category: mortar.category,
    brand: mortar.brand,
    sizeLabel: mortar.sizeLabel,
    dimensions: mortar.dimensions,
    productType: mortar.productType || "High Polymer Modified",
    description:
      mortar.description ||
      "Factory-certified thin-bed jointing mortar engineered for high-strength AAC block wall masonry.",
    bagWeightKg: Number(mortar.bagWeightKg) || 40,
    stock,
    totalIn,
    totalOut,
    latestPurchasePrice,
    latestSellingPrice,
    latestSupplier,
    totalPurchaseValue,
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

