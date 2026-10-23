"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function createProductAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STOCKER"].includes(session.role)) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim() || "AAC Block";
  const sizeLabel = String(formData.get("sizeLabel") ?? "").trim();
  const lengthMm = Number(formData.get("lengthMm") ?? 600);
  const heightMm = Number(formData.get("heightMm") ?? 200);
  const widthMm = Number(formData.get("widthMm") ?? 100);

  if (!sizeLabel || widthMm <= 0 || lengthMm <= 0 || heightMm <= 0) {
    const back = session.role === "ADMIN" ? "/admin/products" : "/stocker/products";
    redirect(`${back}?error=Invalid%20dimensions%20or%20size%20label`);
  }

  // Dimension-based calculated CBM
  const dimensionCbm = (lengthMm * heightMm * widthMm) / 1000000000;

  // Custom CBM per block entered by Super Admin
  const rawCbmInput = formData.get("cbmPerBlock");
  let finalCbm: number;
  if (rawCbmInput !== null && rawCbmInput !== "" && !isNaN(Number(rawCbmInput))) {
    const parsed = Number(rawCbmInput);
    if (parsed <= 0) {
      const back = session.role === "ADMIN" ? "/admin/products" : "/stocker/products";
      redirect(`${back}?error=CBM%20per%20block%20must%20be%20a%20positive%20decimal%20greater%20than%200`);
    }
    finalCbm = Number(parsed.toFixed(4));
  } else {
    finalCbm = Number(dimensionCbm.toFixed(4));
  }

  const bpc = finalCbm > 0 ? Number((1 / finalCbm).toFixed(2)) : 0;
  const dimensions = `${lengthMm} × ${heightMm} × ${widthMm} mm`;

  // Super Admin can set price and active status; Stocker creates size with price 0 and inactive
  const price = session.role === "ADMIN" ? Number(formData.get("price") ?? 0) : 0;
  const gstRate = session.role === "ADMIN" ? Number(formData.get("gstRate") ?? 18) : 18;
  const active = session.role === "ADMIN" ? formData.get("active") === "on" || formData.get("active") === "true" || price > 0 : false;

  // Prevent duplicate conflicts
  const duplicate = await prisma.product.findFirst({
    where: {
      name,
      sizeLabel,
      dimensions,
      deletedAt: null,
    },
  });

  if (duplicate) {
    const back = session.role === "ADMIN" ? "/admin/products" : "/stocker/products";
    redirect(`${back}?error=A%20block%20with%20name%20%22${encodeURIComponent(name)}%22%20and%20dimensions%20%22${encodeURIComponent(dimensions)}%22%20already%20exists`);
  }

  await prisma.product.create({
    data: {
      name,
      category: "AAC_BLOCK",
      brand: "Swarnim",
      sizeLabel,
      dimensions,
      lengthMm,
      heightMm,
      widthMm,
      cbmPerBlock: finalCbm,
      blocksPerCbm: bpc,
      price,
      gstRate,
      active,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/stocker/products");
  revalidatePath("/customer/new-order");
  revalidatePath("/salesman/orders/new");
  revalidatePath("/stock");

  redirect(session.role === "ADMIN" ? "/admin/products" : "/stocker/products");
}

export async function updateProductAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STOCKER"].includes(session.role)) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim() || "AAC Block";
  const sizeLabel = String(formData.get("sizeLabel") ?? "").trim();
  const lengthMm = Number(formData.get("lengthMm") ?? 600);
  const heightMm = Number(formData.get("heightMm") ?? 200);
  const widthMm = Number(formData.get("widthMm") ?? 100);

  if (!id || !sizeLabel || widthMm <= 0) {
    const back = session.role === "ADMIN" ? "/admin/products" : "/stocker/products";
    redirect(`${back}?error=Invalid%20product%20details`);
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    redirect(session.role === "ADMIN" ? "/admin/products" : "/stocker/products");
  }

  // Preserve existing CBM per block unless explicitly updated
  const rawCbmInput = formData.get("cbmPerBlock");
  let finalCbm: number;
  if (rawCbmInput !== null && rawCbmInput !== "" && !isNaN(Number(rawCbmInput))) {
    const parsed = Number(rawCbmInput);
    if (parsed <= 0) {
      const back = session.role === "ADMIN" ? "/admin/products" : "/stocker/products";
      redirect(`${back}?error=CBM%20per%20block%20must%20be%20a%20positive%20decimal%20greater%20than%200`);
    }
    finalCbm = Number(parsed.toFixed(4));
  } else {
    finalCbm = Number(existing.cbmPerBlock);
  }

  const bpc = finalCbm > 0 ? Number((1 / finalCbm).toFixed(2)) : Number(existing.blocksPerCbm);
  const dimensions = `${lengthMm} × ${heightMm} × ${widthMm} mm`;

  if (session.role === "ADMIN") {
    const price = Number(formData.get("price") ?? existing.price);
    const gstRate = Number(formData.get("gstRate") ?? existing.gstRate);
    const active = formData.get("active") === "on" || formData.get("active") === "true";

    await prisma.product.update({
      where: { id },
      data: {
        name,
        sizeLabel,
        dimensions,
        lengthMm,
        heightMm,
        widthMm,
        cbmPerBlock: finalCbm,
        blocksPerCbm: bpc,
        price,
        gstRate,
        active,
      },
    });
  } else {
    // Stocker updates dimensions only, keeping existing name and active setting
    await prisma.product.update({
      where: { id },
      data: {
        sizeLabel,
        dimensions,
        lengthMm,
        heightMm,
        widthMm,
        cbmPerBlock: finalCbm,
        blocksPerCbm: bpc,
      },
    });
  }

  revalidatePath("/admin/products");
  revalidatePath("/stocker/products");
  revalidatePath("/customer/new-order");
  revalidatePath("/salesman/orders/new");
  revalidatePath("/stock");

  redirect(session.role === "ADMIN" ? "/admin/products" : "/stocker/products");
}

export async function toggleProductActiveAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) redirect("/admin/products");

  await prisma.product.update({
    where: { id },
    data: { active: !product.active },
  });

  revalidatePath("/admin/products");
  revalidatePath("/customer/new-order");
  redirect("/admin/products");
}

export async function deleteProductAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Super Admin permission required." };
  }

  if (!id) {
    return { success: false, error: "Product ID is required." };
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return { success: false, error: "Product not found or already deleted." };
  }

  // Soft delete: sets deletedAt timestamp and active: false
  // Protects existing order history and related inventory records
  await prisma.product.update({
    where: { id },
    data: {
      active: false,
      deletedAt: new Date(),
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
  revalidatePath("/customer/new-order");
  revalidatePath("/stock");

  return { success: true };
}
