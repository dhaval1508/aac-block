"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { StockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStock } from "@/lib/utils";

export async function getProductStock(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { category: true, cbmPerBlock: true },
  });
  if (!product) return 0;

  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    select: { quantityDelta: true, cbmDelta: true },
  });

  if (product.category === "AAC_BLOCK") {
    const cbmRate = Number(product.cbmPerBlock) || 0.018;
    const totalCbm = movements.reduce((acc, m) => {
      if (m.cbmDelta != null && Number(m.cbmDelta) !== 0) return acc + Number(m.cbmDelta);
      return acc + m.quantityDelta * cbmRate;
    }, 0);
    return cbmRate > 0 ? Math.round(totalCbm / cbmRate) : 0;
  }

  return movements.reduce((acc, m) => acc + m.quantityDelta, 0);
}

export async function getProductCbm(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { category: true, cbmPerBlock: true },
  });
  if (!product) return 0;

  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    select: { quantityDelta: true, cbmDelta: true },
  });

  const cbmRate = Number(product.cbmPerBlock) || 0.018;
  const totalCbm = movements.reduce((acc, m) => {
    if (m.cbmDelta != null && Number(m.cbmDelta) !== 0) return acc + Number(m.cbmDelta);
    return acc + m.quantityDelta * cbmRate;
  }, 0);

  return Number(totalCbm.toFixed(4));
}

export async function addStockAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageStock(session.role)) {
    redirect("/stock?error=Not%20authorized");
  }

  const returnPath = session.role === "ADMIN" ? "/admin/stock" : "/stocker/stock";

  const productId = String(formData.get("productId") ?? "").trim();
  const rawQuantityInput = formData.get("quantity");
  const rawCbmInput = formData.get("cbm");
  const type = (String(formData.get("type") ?? "IN").toUpperCase() as StockType) || StockType.IN;
  const referenceNo = String(formData.get("referenceNo") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const rawPurchasePrice = formData.get("purchasePrice");
  const purchasePrice =
    rawPurchasePrice !== null && rawPurchasePrice !== "" && !isNaN(Number(rawPurchasePrice))
      ? Number(rawPurchasePrice)
      : null;

  const rawSellingPrice = formData.get("sellingPrice");
  const sellingPrice =
    rawSellingPrice !== null && rawSellingPrice !== "" && !isNaN(Number(rawSellingPrice))
      ? Number(rawSellingPrice)
      : null;

  const supplier = String(formData.get("supplier") ?? "").trim() || null;
  const rawEntryDate = formData.get("entryDate");
  const entryDate =
    rawEntryDate && typeof rawEntryDate === "string" && rawEntryDate.trim() !== ""
      ? new Date(rawEntryDate)
      : new Date();

  if (!productId) {
    redirect(`${returnPath}?error=Please%20select%20a%20valid%20product`);
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    redirect(`${returnPath}?error=Product%20not%20found`);
  }

  const isMortar =
    product.category === "MORTAR" ||
    product.category === "ADHESIVE" ||
    product.category === "BLOCK_JOINTING_MORTAR";

  // For AAC Blocks: exact entered quantity is in CBM.
  // For Mortar: exact entered quantity is in 40 KG Bags.
  const cbmPerBlock = Number(product.cbmPerBlock) || 0.018;

  let cbmValue = 0;
  let blockQuantity = 0;

  if (isMortar) {
    const rawVal =
      rawQuantityInput !== null && rawQuantityInput !== ""
        ? Number(rawQuantityInput)
        : rawCbmInput !== null && rawCbmInput !== ""
        ? Number(rawCbmInput)
        : 0;
    const bags = Math.floor(rawVal);
    if (!Number.isFinite(bags) || bags <= 0) {
      redirect(`${returnPath}?error=Please%20enter%20valid%20mortar%20bags%20quantity%20greater%20than%200`);
    }
    cbmValue = 0;
    blockQuantity = bags;
  } else {
    // For AAC blocks, prioritize direct cbm input over any hidden field
    const rawVal =
      rawCbmInput !== null && rawCbmInput !== ""
        ? Number(rawCbmInput)
        : rawQuantityInput !== null && rawQuantityInput !== ""
        ? Number(rawQuantityInput)
        : 0;

    if (!Number.isFinite(rawVal) || rawVal <= 0) {
      redirect(`${returnPath}?error=Please%20enter%20valid%20CBM%20quantity%20greater%20than%200`);
    }

    cbmValue = Number(rawVal.toFixed(4));
    blockQuantity = Math.max(1, Math.round(cbmValue / cbmPerBlock));
  }

  try {
    if (type === "OUT") {
      // Concurrency protection: Atomic transaction with balance verification
      await prisma.$transaction(async (tx) => {
        const movements = await tx.stockMovement.findMany({
          where: { productId },
          select: { cbmDelta: true, quantityDelta: true },
        });

        if (isMortar) {
          const currentBags = movements.reduce((acc, m) => acc + m.quantityDelta, 0);
          if (blockQuantity > currentBags) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${currentBags} bags (40 KG), requested: ${blockQuantity} bags.`
            );
          }
        } else {
          const currentCbm = movements.reduce((acc, m) => {
            if (m.cbmDelta != null && Number(m.cbmDelta) !== 0) return acc + Number(m.cbmDelta);
            return acc + m.quantityDelta * cbmPerBlock;
          }, 0);

          if (cbmValue > currentCbm) {
            throw new Error(
              `Insufficient stock for ${product.name} (${product.sizeLabel}). Available: ${currentCbm.toFixed(3)} CBM (≈ ${Math.round(currentCbm / cbmPerBlock)} blocks), requested: ${cbmValue.toFixed(3)} CBM.`
            );
          }
        }

        await tx.stockMovement.create({
          data: {
            productId,
            type: StockType.OUT,
            quantityDelta: -blockQuantity,
            cbmDelta: isMortar ? 0 : -cbmValue,
            referenceNo,
            note: note || (isMortar ? "Manual mortar stock outflow" : "Manual stock out"),
            purchasePrice: purchasePrice !== null ? purchasePrice : null,
            sellingPrice: sellingPrice !== null ? sellingPrice : null,
            supplier,
            entryDate,
            createdById: session.id,
          },
        });
      });
    } else {
      // Stock In
      await prisma.stockMovement.create({
        data: {
          productId,
          type: StockType.IN,
          quantityDelta: blockQuantity,
          cbmDelta: isMortar ? 0 : cbmValue,
          referenceNo,
          note: note || (isMortar ? "Mortar production/purchase intake" : "Stock received from production"),
          purchasePrice: purchasePrice !== null ? purchasePrice : null,
          sellingPrice: sellingPrice !== null ? sellingPrice : null,
          supplier,
          entryDate,
          createdById: session.id,
        },
      });
    }
  } catch (err: any) {
    const errorMsg = encodeURIComponent(err?.message || "Stock transaction failed");
    redirect(`${returnPath}?error=${errorMsg}`);
  }

  revalidatePath("/admin/stock");
  revalidatePath("/stocker/stock");
  revalidatePath("/admin/dashboard");
  revalidatePath("/stocker/dashboard");
  revalidatePath("/stock");
  revalidatePath("/stocker/activity");
  revalidatePath("/admin/activity");

  redirect(returnPath);
}

export async function updateStockAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageStock(session.role)) {
    redirect("/stock?error=Not%20authorized");
  }

  const returnPath = session.role === "ADMIN" ? "/admin/stock" : "/stocker/stock";

  const movementId = String(formData.get("movementId") ?? "").trim();
  const rawQuantityInput = formData.get("quantity");
  const rawCbmInput = formData.get("cbm");
  const referenceNo = String(formData.get("referenceNo") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const rawPurchasePrice = formData.get("purchasePrice");
  const purchasePrice =
    rawPurchasePrice !== null && rawPurchasePrice !== "" && !isNaN(Number(rawPurchasePrice))
      ? Number(rawPurchasePrice)
      : null;

  const rawSellingPrice = formData.get("sellingPrice");
  const sellingPrice =
    rawSellingPrice !== null && rawSellingPrice !== "" && !isNaN(Number(rawSellingPrice))
      ? Number(rawSellingPrice)
      : null;

  const supplier = String(formData.get("supplier") ?? "").trim() || null;
  const rawEntryDate = formData.get("entryDate");
  const entryDate =
    rawEntryDate && typeof rawEntryDate === "string" && rawEntryDate.trim() !== ""
      ? new Date(rawEntryDate)
      : undefined;

  if (!movementId) {
    redirect(`${returnPath}?error=Invalid%20movement%20identifier`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.stockMovement.findUnique({
        where: { id: movementId },
        include: { product: true },
      });

      if (!existing) {
        throw new Error("Stock movement record not found");
      }

      const isMortar =
        existing.product.category === "MORTAR" ||
        existing.product.category === "ADHESIVE" ||
        existing.product.category === "BLOCK_JOINTING_MORTAR";

      const cbmPerBlock = Number(existing.product.cbmPerBlock) || 0.018;

      let newCbmDelta = 0;
      let newQuantityDelta = 0;

      if (isMortar) {
        const rawVal =
          rawQuantityInput !== null && rawQuantityInput !== ""
            ? Number(rawQuantityInput)
            : rawCbmInput !== null && rawCbmInput !== ""
            ? Number(rawCbmInput)
            : 0;
        const bags = Math.floor(rawVal);
        if (!Number.isFinite(bags) || bags <= 0) {
          throw new Error("Please enter valid mortar bags quantity greater than 0");
        }
        newQuantityDelta = existing.type === StockType.OUT ? -bags : bags;
        newCbmDelta = 0;
      } else {
        const rawVal =
          rawCbmInput !== null && rawCbmInput !== ""
            ? Number(rawCbmInput)
            : rawQuantityInput !== null && rawQuantityInput !== ""
            ? Number(rawQuantityInput)
            : 0;

        if (!Number.isFinite(rawVal) || rawVal <= 0) {
          throw new Error("Please enter valid CBM quantity greater than 0");
        }

        const cbmVal = Number(rawVal.toFixed(4));
        const blocks = Math.max(1, Math.round(cbmVal / cbmPerBlock));
        newCbmDelta = existing.type === StockType.OUT ? -cbmVal : cbmVal;
        newQuantityDelta = existing.type === StockType.OUT ? -blocks : blocks;
      }

      const movements = await tx.stockMovement.findMany({
        where: { productId: existing.productId },
        select: { id: true, cbmDelta: true, quantityDelta: true },
      });

      if (isMortar) {
        const currentBags = movements.reduce((acc, m) => acc + m.quantityDelta, 0);
        const deltaDiff = newQuantityDelta - existing.quantityDelta;
        const projectedBags = currentBags + deltaDiff;
        if (projectedBags < 0) {
          throw new Error(
            `Cannot update stock: resulting balance would be negative (${projectedBags} bags). Available: ${currentBags} bags.`
          );
        }
      } else {
        const currentCbm = movements.reduce((acc, m) => {
          if (m.cbmDelta != null && Number(m.cbmDelta) !== 0) return acc + Number(m.cbmDelta);
          return acc + m.quantityDelta * cbmPerBlock;
        }, 0);

        const oldMovementCbm =
          existing.cbmDelta != null && Number(existing.cbmDelta) !== 0
            ? Number(existing.cbmDelta)
            : existing.quantityDelta * cbmPerBlock;

        const deltaDiffCbm = newCbmDelta - oldMovementCbm;
        const projectedCbm = currentCbm + deltaDiffCbm;

        if (projectedCbm < 0) {
          throw new Error(
            `Cannot update stock: resulting balance would be negative (${projectedCbm.toFixed(3)} CBM). Available: ${currentCbm.toFixed(3)} CBM.`
          );
        }
      }

      await tx.stockMovement.update({
        where: { id: movementId },
        data: {
          quantityDelta: newQuantityDelta,
          cbmDelta: isMortar ? 0 : newCbmDelta,
          referenceNo,
          note,
          purchasePrice: purchasePrice !== null ? purchasePrice : existing.purchasePrice,
          sellingPrice: sellingPrice !== null ? sellingPrice : existing.sellingPrice,
          supplier: supplier !== null ? supplier : existing.supplier,
          ...(entryDate ? { entryDate } : {}),
        },
      });
    });
  } catch (err: any) {
    const errorMsg = encodeURIComponent(err?.message || "Stock update failed");
    redirect(`${returnPath}?error=${errorMsg}`);
  }

  revalidatePath("/admin/stock");
  revalidatePath("/stocker/stock");
  revalidatePath("/admin/dashboard");
  revalidatePath("/stocker/dashboard");
  revalidatePath("/stock");
  revalidatePath("/stocker/activity");
  revalidatePath("/admin/activity");

  redirect(returnPath);
}

export async function deleteStockAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageStock(session.role)) {
    redirect("/stock?error=Not%20authorized");
  }

  const returnPath = session.role === "ADMIN" ? "/admin/stock" : "/stocker/stock";
  const movementId = String(formData.get("movementId") ?? "").trim();

  if (!movementId) {
    redirect(`${returnPath}?error=No%20stock%20entry%20selected%20for%20deletion`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.stockMovement.findUnique({
        where: { id: movementId },
        include: { product: true, order: true },
      });

      if (!existing) {
        throw new Error("Stock movement record not found");
      }

      if (existing.orderId) {
        throw new Error(
          `Cannot delete stock entry linked to automated dispatch order ${existing.order?.orderNo || ""}.`
        );
      }

      const isMortar =
        existing.product.category === "MORTAR" ||
        existing.product.category === "ADHESIVE" ||
        existing.product.category === "BLOCK_JOINTING_MORTAR";

      const movements = await tx.stockMovement.findMany({
        where: { productId: existing.productId },
        select: { id: true, cbmDelta: true, quantityDelta: true },
      });

      if (isMortar) {
        const currentBags = movements.reduce((acc, m) => acc + m.quantityDelta, 0);
        const projectedBags = currentBags - existing.quantityDelta;
        if (projectedBags < 0) {
          throw new Error(
            `Cannot delete entry: remaining stock would drop below zero (${projectedBags} bags). Available: ${currentBags} bags.`
          );
        }
      } else {
        const cbmPerBlock = Number(existing.product.cbmPerBlock) || 0.018;
        const currentCbm = movements.reduce((acc, m) => {
          if (m.cbmDelta != null && Number(m.cbmDelta) !== 0) return acc + Number(m.cbmDelta);
          return acc + m.quantityDelta * cbmPerBlock;
        }, 0);

        const movementCbm =
          existing.cbmDelta != null && Number(existing.cbmDelta) !== 0
            ? Number(existing.cbmDelta)
            : existing.quantityDelta * cbmPerBlock;

        const projectedCbm = currentCbm - movementCbm;

        if (projectedCbm < 0) {
          throw new Error(
            `Cannot delete entry: remaining stock would drop below zero (${projectedCbm.toFixed(3)} CBM). Available: ${currentCbm.toFixed(3)} CBM.`
          );
        }
      }

      await tx.stockMovement.delete({
        where: { id: movementId },
      });
    });
  } catch (err: any) {
    const errorMsg = encodeURIComponent(err?.message || "Stock deletion failed");
    redirect(`${returnPath}?error=${errorMsg}`);
  }

  revalidatePath("/admin/stock");
  revalidatePath("/stocker/stock");
  revalidatePath("/admin/dashboard");
  revalidatePath("/stocker/dashboard");
  revalidatePath("/stock");
  revalidatePath("/stocker/activity");
  revalidatePath("/admin/activity");

  redirect(returnPath);
}
