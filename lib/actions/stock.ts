"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { StockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStock } from "@/lib/utils";

export async function getProductStock(productId: string): Promise<number> {
  const result = await prisma.stockMovement.aggregate({
    where: { productId },
    _sum: { quantityDelta: true },
  });
  return result._sum.quantityDelta ?? 0;
}

export async function addStockAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canManageStock(session.role)) {
    redirect("/stock?error=Not%20authorized");
  }

  const productId = String(formData.get("productId") ?? "");
  const quantity = Math.floor(Number(formData.get("quantity") ?? 0));
  const type = String(formData.get("type") ?? "IN") as StockType;
  const referenceNo = String(formData.get("referenceNo") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const returnPath = session.role === "ADMIN" ? "/admin/stock" : "/stocker/stock";

  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    redirect(`${returnPath}?error=Please%20select%20a%20block%20size%20and%20enter%20valid%20quantity`);
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    redirect(`${returnPath}?error=Product%20not%20found`);
  }

  try {
    if (type === "OUT") {
      // Concurrency protection: Atomic transaction with balance verification
      await prisma.$transaction(async (tx) => {
        const agg = await tx.stockMovement.aggregate({
          where: { productId },
          _sum: { quantityDelta: true },
        });
        const currentStock = agg._sum.quantityDelta ?? 0;
        if (quantity > currentStock) {
          throw new Error(
            `Insufficient stock for ${product.sizeLabel}. Available: ${currentStock} blocks, requested: ${quantity} blocks.`
          );
        }

        await tx.stockMovement.create({
          data: {
            productId,
            type: StockType.OUT,
            quantityDelta: -quantity,
            referenceNo,
            note: note || "Manual stock out",
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
          quantityDelta: quantity,
          referenceNo,
          note: note || "Stock received from production",
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
