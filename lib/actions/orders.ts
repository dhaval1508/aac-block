"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderStatus, PaymentMode, PaymentStatus, StockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getProductStock } from "@/lib/actions/stock";

async function nextOrderNo() {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const count = await prisma.order.count();
  const nextNum = 1001 + count;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

async function nextInvoiceNo() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const count = await prisma.order.count({
    where: { invoiceNo: { not: null } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

// 1. Customer places order
export async function placeCustomerOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN"].includes(session.role)) {
    redirect("/login");
  }

  const productId = String(formData.get("productId") ?? "");
  const quantity = Math.floor(Number(formData.get("quantity") ?? 0));
  const deliveryAddress = String(formData.get("deliveryAddress") ?? "").trim();
  const requestedDateRaw = String(formData.get("requestedDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!productId || quantity <= 0 || !deliveryAddress) {
    redirect("/customer/new-order?error=Select%20block%20size,%20quantity%20and%20address");
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) {
    redirect("/customer/new-order?error=Selected%20block%20size%20is%20not%20available");
  }

  const rate = Number(product.price) > 0 ? Number(product.price) : 50;
  const subtotal = quantity * rate;
  const gstAmount = subtotal * (Number(product.gstRate) / 100);
  const totalAmount = subtotal + gstAmount;

  const orderNo = await nextOrderNo();

  const order = await prisma.order.create({
    data: {
      orderNo,
      customerId: session.id,
      productId,
      quantity,
      rate,
      gstRate: product.gstRate,
      subtotal,
      gstAmount,
      totalAmount,
      deliveryAddress,
      requestedDate: requestedDateRaw ? new Date(requestedDateRaw) : null,
      notes,
      status: OrderStatus.PENDING,
      events: {
        create: {
          status: OrderStatus.PENDING,
          title: "Order Placed",
          note: "Waiting for admin confirmation",
          createdById: session.id,
        },
      },
    },
  });

  revalidatePath("/customer/dashboard");
  revalidatePath("/customer/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");

  redirect(`/customer/orders/${order.id}?success=1`);
}

// 2. Admin confirms order
export async function confirmOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const quantity = Math.floor(Number(formData.get("quantity") ?? 0));
  const rate = Number(formData.get("rate") ?? 0);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });

  if (!order || order.status !== OrderStatus.PENDING) {
    redirect(`/admin/orders/${orderId}?error=Order%20is%20not%20pending`);
  }

  const finalQty = quantity > 0 ? quantity : order.quantity;
  const finalRate = rate > 0 ? rate : Number(order.rate);

  const subtotal = finalQty * finalRate;
  const gstAmount = subtotal * (Number(order.gstRate) / 100);
  const totalAmount = subtotal + gstAmount;

  const invoiceNo = await nextInvoiceNo();
  const shareToken = crypto.randomBytes(24).toString("hex");

  await prisma.order.update({
    where: { id: orderId },
    data: {
      quantity: finalQty,
      rate: finalRate,
      subtotal,
      gstAmount,
      totalAmount,
      invoiceNo,
      shareToken,
      status: OrderStatus.CONFIRMED,
      confirmedAt: new Date(),
      events: {
        create: {
          status: OrderStatus.CONFIRMED,
          title: "Order Confirmed",
          note: "Order approved by Super Admin and GST invoice generated",
          createdById: session.id,
        },
      },
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/customer/orders");
  redirect(`/admin/orders/${orderId}`);
}

// 3. Admin rejects order
export async function rejectOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || "Rejected by Super Admin";

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.REJECTED,
      events: {
        create: {
          status: OrderStatus.REJECTED,
          title: "Order Rejected",
          note: reason,
          createdById: session.id,
        },
      },
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${orderId}`);
}

// 4. Admin assigns transport & loading staff
export async function assignTransportAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const staffId = String(formData.get("staffId") ?? "").trim();
  const truckNumber = String(formData.get("truckNumber") ?? "").trim();
  const driverName = String(formData.get("driverName") ?? "").trim();
  const driverMobile = String(formData.get("driverMobile") ?? "").trim();
  const transporterName = String(formData.get("transporterName") ?? "").trim() || null;
  const expectedDeliveryRaw = String(formData.get("expectedDelivery") ?? "").trim();

  if (!staffId || !truckNumber || !driverName || !driverMobile) {
    redirect(`/admin/orders/${orderId}?error=Staff,%20truck,%20driver%20name%20and%20mobile%20are%20required`);
  }

  await prisma.transport.upsert({
    where: { orderId },
    create: {
      orderId,
      transporterName,
      truckNumber,
      driverName,
      driverMobile,
      expectedDelivery: expectedDeliveryRaw ? new Date(expectedDeliveryRaw) : null,
    },
    update: {
      transporterName,
      truckNumber,
      driverName,
      driverMobile,
      expectedDelivery: expectedDeliveryRaw ? new Date(expectedDeliveryRaw) : null,
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      assignedStaffId: staffId,
      status: OrderStatus.ASSIGNED,
      events: {
        create: {
          status: OrderStatus.ASSIGNED,
          title: "Assigned for Loading",
          note: `Truck ${truckNumber} • Driver ${driverName} • ${driverMobile}`,
          createdById: session.id,
        },
      },
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  redirect(`/admin/orders/${orderId}`);
}

// 5. Staff starts loading
export async function startLoadingAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STAFF"].includes(session.role)) redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    redirect("/staff/dashboard?error=Order%20not%20found");
  }

  // Security Guard: Staff can only load orders assigned to them
  if (session.role === "STAFF" && order.assignedStaffId !== session.id) {
    redirect(`/staff/dashboard?error=You%20are%20not%20assigned%20to%20order%20${order.orderNo}`);
  }

  if (order.status !== OrderStatus.ASSIGNED) {
    redirect(`/staff/orders/${orderId}?error=Order%20is%20not%20in%20assigned%20state`);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.LOADING,
      events: {
        create: {
          status: OrderStatus.LOADING,
          title: "Loading Started",
          note: `Loading staff (${session.name}) started material loading into truck`,
          createdById: session.id,
        },
      },
    },
  });

  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/customer/orders/${orderId}`);
  redirect(`/staff/orders/${orderId}`);
}

// 6. Staff marks loading done with actual counted blocks
export async function completeLoadingAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STAFF"].includes(session.role)) redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const loadedQuantity = Math.floor(Number(formData.get("loadedQuantity") ?? 0));
  const shortageReason = String(formData.get("shortageReason") ?? "").trim();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    redirect("/staff/dashboard?error=Order%20not%20found");
  }

  // Security Guard: Staff can only load orders assigned to them
  if (session.role === "STAFF" && order.assignedStaffId !== session.id) {
    redirect(`/staff/dashboard?error=You%20are%20not%20assigned%20to%20order%20${order.orderNo}`);
  }

  if (order.status !== OrderStatus.LOADING) {
    redirect(`/staff/orders/${orderId}?error=Order%20is%20not%20in%20loading%20state`);
  }

  // Strict Validation: Never allow zero, negative or blank quantities
  if (loadedQuantity <= 0) {
    redirect(`/staff/orders/${orderId}?error=Please%20enter%20a%20valid%20positive%20loaded%20quantity`);
  }

  if (loadedQuantity > order.quantity) {
    redirect(
      `/staff/orders/${orderId}?error=Loaded%20quantity%20(${loadedQuantity})%20cannot%20exceed%20ordered%20quantity%20(${order.quantity})`
    );
  }

  const isShortage = loadedQuantity < order.quantity;
  const noteText = isShortage
    ? `Partially loaded: ${loadedQuantity.toLocaleString()} / ${order.quantity.toLocaleString()} blocks (Shortage of ${(
        order.quantity - loadedQuantity
      ).toLocaleString()} blocks). Note: ${shortageReason || "Truck capacity limit"}`
    : `${loadedQuantity.toLocaleString()} blocks physically verified and loaded into truck by ${session.name}`;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.LOADED,
      loadedQuantity,
      events: {
        create: {
          status: OrderStatus.LOADED,
          title: isShortage ? "Partial Loading Completed" : "Loading Completed",
          note: noteText,
          createdById: session.id,
        },
      },
    },
  });

  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/customer/orders/${orderId}`);
  redirect(`/staff/orders/${orderId}`);
}

// 7. Admin dispatches loaded order (Automatic Stock Out with stock check)
export async function dispatchOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });

  if (!order || order.status !== OrderStatus.LOADED) {
    redirect(`/admin/orders/${orderId}?error=Order%20must%20be%20loaded%20before%20dispatch`);
  }

  const outQty = order.loadedQuantity > 0 ? order.loadedQuantity : order.quantity;
  const currentStock = await getProductStock(order.productId);

  if (currentStock < outQty) {
    redirect(
      `/admin/orders/${orderId}?error=Not%20enough%20stock%20to%20dispatch.%20Available:%20${currentStock}%20blocks,%20required:%20${outQty}.`
    );
  }

  // Automatic Stock Out
  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId: order.productId,
        orderId: order.id,
        type: StockType.OUT,
        quantityDelta: -outQty,
        referenceNo: order.orderNo,
        note: `Automatic stock out on dispatch of ${order.orderNo}`,
        createdById: session.id,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DISPATCHED,
        dispatchedAt: new Date(),
        events: {
          create: {
            status: OrderStatus.DISPATCHED,
            title: "Order Dispatched",
            note: `Truck left the yard • ${outQty.toLocaleString()} blocks deducted from stock`,
            createdById: session.id,
          },
        },
      },
    }),
  ]);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/stock");
  revalidatePath("/stocker/stock");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/orders/${orderId}`);
}

// 8. Admin marks material delivered
export async function deliverOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
      events: {
        create: {
          status: OrderStatus.DELIVERED,
          title: "Order Delivered",
          note: "Material received and confirmed at customer site",
          createdById: session.id,
        },
      },
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}

// 9. Admin records payment
export async function recordPaymentAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const mode = String(formData.get("mode") ?? "UPI") as PaymentMode;
  const referenceNo = String(formData.get("referenceNo") ?? "").trim() || null;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) redirect("/admin/orders");

  const balance = Math.max(0, Number(order.totalAmount) - Number(order.paidAmount));

  if (amount <= 0 || amount > balance + 0.01) {
    redirect(`/admin/orders/${orderId}?error=Invalid%20payment%20amount`);
  }

  const newPaid = Number(order.paidAmount) + amount;
  const newStatus = newPaid + 0.01 >= Number(order.totalAmount) ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        orderId,
        amount,
        mode,
        referenceNo,
        createdById: session.id,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        paidAmount: newPaid,
        paymentStatus: newStatus,
        events: {
          create: {
            status: order.status,
            title: "Payment Received",
            note: `Payment receipt recorded via ${mode}${
              referenceNo ? ` • Ref: ${referenceNo}` : ""
            }`,
            createdById: session.id,
          },
        },
      },
    }),
  ]);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/payments");
  redirect(`/admin/orders/${orderId}`);
}
