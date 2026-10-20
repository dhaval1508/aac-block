"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderStatus, PaymentMode, PaymentStatus, StockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getProductStock } from "@/lib/actions/stock";
import { dispatchNotification } from "@/lib/push-dispatcher";
import { formatNumber } from "@/lib/utils";

async function nextOrderNo() {
  const year = new Date().getFullYear();
  const count = await prisma.order.count();
  const nextNum = 1001 + count;
  return `SWA-${year}-${String(nextNum).padStart(4, "0")}`;
}

async function nextInvoiceNo() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const count = await prisma.order.count({
    where: { invoiceNo: { not: null } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

// 1. Customer places order (Strictly order placement without pricing)
export async function placeCustomerOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN"].includes(session.role)) {
    redirect("/login");
  }

  let deliveryAddress = String(formData.get("deliveryAddress") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const requestedDateRaw = String(formData.get("requestedDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const itemsJson = String(formData.get("itemsJson") ?? "").trim();
  const rawAdhesiveBags = formData.get("adhesiveBags");
  const adhesiveBags = rawAdhesiveBags !== null ? Math.max(0, Math.floor(Number(rawAdhesiveBags) || 0)) : 0;

  // Append city and pincode to address if not already present
  if (city && !deliveryAddress.toLowerCase().includes(city.toLowerCase())) {
    deliveryAddress = `${deliveryAddress}, ${city}`;
  }
  if (pincode && !deliveryAddress.includes(pincode)) {
    deliveryAddress = `${deliveryAddress} - ${pincode}`;
  }

  if (!deliveryAddress) {
    redirect("/customer/new-order?error=Delivery%20site%20address%20is%20required");
  }

  const orderItemsToProcess: OrderItemInput[] = [];

  if (itemsJson) {
    try {
      const parsed = JSON.parse(itemsJson) as OrderItemInput[];
      if (Array.isArray(parsed)) {
        for (const it of parsed) {
          if (it.productId && it.quantity > 0) {
            orderItemsToProcess.push({
              productId: it.productId,
              quantity: Math.floor(it.quantity),
            });
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to legacy fields if JSON not present
  if (orderItemsToProcess.length === 0) {
    const primaryProductId = String(formData.get("productId") ?? "").trim();
    const primaryQuantity = Math.floor(Number(formData.get("quantity") ?? 0));
    if (primaryProductId && primaryQuantity > 0) {
      orderItemsToProcess.push({ productId: primaryProductId, quantity: primaryQuantity });
    }
  }

  // Ensure adhesive is added to items if adhesiveBags > 0
  const activeAdhesiveProduct = await prisma.product.findFirst({
    where: { category: "ADHESIVE", active: true },
  });

  if (activeAdhesiveProduct && adhesiveBags > 0) {
    const alreadyHasAdhesive = orderItemsToProcess.some((it) => it.productId === activeAdhesiveProduct.id);
    if (!alreadyHasAdhesive) {
      orderItemsToProcess.push({
        productId: activeAdhesiveProduct.id,
        quantity: adhesiveBags,
      });
    }
  }

  if (orderItemsToProcess.length === 0) {
    redirect("/customer/new-order?error=Please%20select%20at%20least%20one%20product%20with%20valid%20quantity");
  }

  // Fetch all selected products
  const productIds = orderItemsToProcess.map((it) => it.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  let combinedCbm = 0;
  let combinedSqft = 0;
  let totalBlocks = 0;
  let hasAdhesive = adhesiveBags > 0;

  const resolvedItems: Array<{
    productId: string;
    productType: string;
    productName: string;
    sizeLabel: string;
    dimensions: string;
    quantity: number;
    cbmPerUnit: number;
    totalCbm: number;
    sqftPerUnit: number;
    totalSqft: number;
    rate: number;
    gstRate: number;
    subtotal: number;
    gstAmount: number;
    totalAmount: number;
  }> = [];

  for (const it of orderItemsToProcess) {
    const prod = productMap.get(it.productId);
    if (!prod) continue;

    let cbmPerUnit = 0;
    let totalCbm = 0;
    let sqftPerUnit = 0;
    let totalSqft = 0;

    if (prod.category === "AAC_BLOCK") {
      cbmPerUnit = Number(prod.cbmPerBlock) || 0;
      totalCbm = Number((it.quantity * cbmPerUnit).toFixed(4));
      // Formula: Blocks * (Length * Height / 1,000,000) * 10.7639104167 = Qty * 1.29166925
      sqftPerUnit = 1.29;
      totalSqft = Number((it.quantity * 1.29166925).toFixed(2));
      combinedCbm += totalCbm;
      combinedSqft += totalSqft;
      totalBlocks += it.quantity;
    } else if (prod.category === "ADHESIVE") {
      hasAdhesive = true;
    }

    resolvedItems.push({
      productId: prod.id,
      productType: prod.category,
      productName: prod.name,
      sizeLabel: prod.sizeLabel,
      dimensions: prod.dimensions,
      quantity: it.quantity,
      cbmPerUnit,
      totalCbm,
      sqftPerUnit,
      totalSqft,
      rate: 0,
      gstRate: 0,
      subtotal: 0,
      gstAmount: 0,
      totalAmount: 0,
    });
  }

  if (resolvedItems.length === 0) {
    redirect("/customer/new-order?error=Selected%20products%20are%20not%20available");
  }

  const orderNo = await nextOrderNo();
  const primaryItem = resolvedItems.find((it) => it.productType === "AAC_BLOCK") || resolvedItems[0];
  const aacBlockItems = resolvedItems.filter((it) => it.productType === "AAC_BLOCK");
  const blockSizesSummary = aacBlockItems.map((it) => it.sizeLabel).join(", ") || primaryItem.sizeLabel;

  const order = await prisma.$transaction(async (tx) => {
    const ord = await tx.order.create({
      data: {
        orderNo,
        customerId: session.id,
        productId: primaryItem.productId,
        quantity: totalBlocks > 0 ? totalBlocks : primaryItem.quantity,
        rate: 0,
        gstRate: 0,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        totalCbm: combinedCbm > 0 ? Number(combinedCbm.toFixed(4)) : null,
        totalSqft: combinedSqft > 0 ? Number(combinedSqft.toFixed(2)) : null,
        hasMortar: false,
        hasAdhesive,
        adhesiveBags,
        deliveryAddress,
        requestedDate: requestedDateRaw ? new Date(requestedDateRaw) : null,
        notes,
        status: OrderStatus.PENDING,
        items: {
          create: resolvedItems.map((it) => ({
            productId: it.productId,
            productType: it.productType,
            productName: it.productName,
            sizeLabel: it.sizeLabel,
            dimensions: it.dimensions,
            quantity: it.quantity,
            cbmPerUnit: it.cbmPerUnit,
            totalCbm: it.totalCbm,
            sqftPerUnit: it.sqftPerUnit,
            totalSqft: it.totalSqft,
            rate: 0,
            gstRate: 0,
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
          })),
        },
        events: {
          create: {
            status: OrderStatus.PENDING,
            title: "Order Placed",
            note: `Order booked: ${totalBlocks.toLocaleString()} AAC Blocks (${combinedCbm.toFixed(2)} CBM) + ${adhesiveBags} Bags GOLD (G100) 40 KG`,
            createdById: session.id,
          },
        },
      },
    });

    return ord;
  });

  // Real-Time Notification to Admin (Strictly zero price)
  const customer = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true, companyName: true },
  });
  const customerName = customer?.companyName || customer?.name || session.name;

  await dispatchNotification({
    role: "ADMIN",
    title: "New AAC Block Order",
    message: `Order ID: ${order.orderNo}\nBlock Size: ${blockSizesSummary}\nQuantity: ${totalBlocks.toLocaleString()}\nTotal CBM: ${combinedCbm.toFixed(2)}\nGOLD (G100) 40 KG: ${adhesiveBags} Bags\nCustomer: ${customerName}`,
    link: `/admin/orders/${order.id}`,
    orderId: order.id,
    type: "NEW_ORDER",
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
    include: { product: true, items: true, customer: true },
  });

  if (!order || order.status !== OrderStatus.PENDING) {
    redirect(`/admin/orders/${orderId}?error=Order%20is%20not%20pending`);
  }

  const finalQty = quantity > 0 ? quantity : order.quantity;
  const finalRate = rate > 0 ? rate : Number(order.rate);

  let subtotal = order.subtotal;
  let gstAmount = order.gstAmount;
  let totalAmount = order.totalAmount;

  if (quantity > 0 || rate > 0) {
    const s = finalQty * finalRate;
    const g = s * (Number(order.gstRate) / 100);
    subtotal = s as any;
    gstAmount = g as any;
    totalAmount = (s + g) as any;
  }

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
          note: `Order approved by Super Admin and Delivery Challan ${invoiceNo} generated`,
          createdById: session.id,
        },
      },
    },
  });

  // Notify customer
  await dispatchNotification({
    userId: order.customerId,
    title: "Order Confirmed by Factory",
    message: `Order ${order.orderNo} has been confirmed. Challan: ${invoiceNo}`,
    link: `/customer/orders/${orderId}`,
    orderId,
    type: "STATUS_CHANGE",
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

  const order = await prisma.order.update({
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

  await dispatchNotification({
    userId: order.customerId,
    title: "Order Update",
    message: `Order ${order.orderNo} was not approved: ${reason}`,
    link: `/customer/orders/${orderId}`,
    orderId,
    type: "STATUS_CHANGE",
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${orderId}`);
}

// 4. Admin assigns transport & loading staff (Sends push to Loader)
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

  const order = await prisma.order.update({
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

  // Push notification to Assigned Loader
  await dispatchNotification({
    userId: staffId,
    title: "New Loading Task Assigned",
    message: `Order ID: ${order.orderNo}\nQuantity: ${formatNumber(order.quantity)} Blocks\nTotal CBM: ${Number(order.totalCbm || 0).toFixed(2)}\nGOLD (G100) 40 KG: ${order.adhesiveBags ?? 0} Bags\nTruck: ${truckNumber}`,
    link: `/staff/orders/${orderId}`,
    orderId,
    type: "ORDER_ASSIGNED",
  });

  // Notify customer
  await dispatchNotification({
    userId: order.customerId,
    title: "Transport Vehicle Allocated",
    message: `Truck ${truckNumber} (Driver: ${driverName}) allocated for order ${order.orderNo}`,
    link: `/customer/orders/${orderId}`,
    orderId,
    type: "STATUS_CHANGE",
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

  // Notify Admin
  await dispatchNotification({
    role: "ADMIN",
    title: "Physical Loading Started",
    message: `Staff ${session.name} started loading Order ${order.orderNo}`,
    link: `/admin/orders/${orderId}`,
    orderId,
    type: "STATUS_CHANGE",
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

  // Notify Admin
  await dispatchNotification({
    role: "ADMIN",
    title: "Loading Completed — Ready for Dispatch",
    message: `Order ${order.orderNo} loaded (${loadedQuantity.toLocaleString()} blocks counted). Ready for gate out.`,
    link: `/admin/orders/${orderId}`,
    orderId,
    type: "STATUS_CHANGE",
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
    include: { product: true, items: true, transport: true },
  });

  if (!order || order.status !== OrderStatus.LOADED) {
    redirect(`/admin/orders/${orderId}?error=Order%20must%20be%20loaded%20before%20dispatch`);
  }

  // Deduct stock for all items
  const itemsToDeduct = order.items.length > 0
    ? order.items.map((it) => ({
        productId: it.productId,
        qty: it.loadedQuantity > 0 ? it.loadedQuantity : it.quantity,
      }))
    : order.productId
    ? [
        {
          productId: order.productId,
          qty: order.loadedQuantity > 0 ? order.loadedQuantity : order.quantity,
        },
      ]
    : [];

  // Check stock for each
  for (const it of itemsToDeduct) {
    const currentStock = await getProductStock(it.productId);
    if (currentStock < it.qty) {
      redirect(
        `/admin/orders/${orderId}?error=Not%20enough%20stock%20for%20product.%20Available:%20${currentStock},%20required:%20${it.qty}.`
      );
    }
  }

  // Automatic Stock Out movements in transaction
  await prisma.$transaction(async (tx) => {
    for (const it of itemsToDeduct) {
      await tx.stockMovement.create({
        data: {
          productId: it.productId,
          orderId: order.id,
          type: StockType.OUT,
          quantityDelta: -it.qty,
          referenceNo: order.orderNo,
          note: `Automatic stock out on dispatch of ${order.orderNo}`,
          createdById: session.id,
        },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DISPATCHED,
        dispatchedAt: new Date(),
        events: {
          create: {
            status: OrderStatus.DISPATCHED,
            title: "Order Dispatched",
            note: `Truck ${order.transport?.truckNumber || ""} left the factory yard • Deducted from inventory`,
            createdById: session.id,
          },
        },
      },
    });
  });

  // Notify customer of dispatch
  await dispatchNotification({
    userId: order.customerId,
    title: "Order Dispatched from Factory",
    message: `Order ${order.orderNo} has been dispatched. Truck ${order.transport?.truckNumber || ""} is on its way.`,
    link: `/customer/orders/${orderId}`,
    orderId,
    type: "DISPATCH",
  });

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

  const order = await prisma.order.update({
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

  await dispatchNotification({
    userId: order.customerId,
    title: "Delivery Completed",
    message: `Order ${order.orderNo} has been marked as delivered at site.`,
    link: `/customer/orders/${orderId}`,
    orderId,
    type: "DELIVERED",
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
