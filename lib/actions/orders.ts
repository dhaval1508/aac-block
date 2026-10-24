"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderStatus, PaymentMode, PaymentStatus, StockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getProductStock, getProductCbm } from "@/lib/actions/stock";
import { dispatchNotification } from "@/lib/push-dispatcher";
import { formatNumber, formatBlockSizeName, isGoogleMapsUrl } from "@/lib/utils";
import { getNextDeliveryChallanNumber } from "@/lib/delivery-challan";
import { verifyGstNumber } from "@/lib/gst";

function isRedirectError(error: any): boolean {
  if (!error || typeof error !== "object") return false;
  return (
    error.message === "NEXT_REDIRECT" ||
    (typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT"))
  );
}

export async function nextOrderNo(tx?: any): Promise<string> {
  const db = tx ?? prisma;
  const year = new Date().getFullYear();
  const prefix = `SWA-${year}-`;

  // Fetch all existing orders for the current year prefix
  const orders = await db.order.findMany({
    where: {
      orderNo: { startsWith: prefix },
    },
    select: { orderNo: true },
  });

  let maxNum = 1000;
  for (const o of orders) {
    const suffix = o.orderNo.replace(prefix, "").trim();
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${prefix}${String(nextNum).padStart(4, "0")}`;

  // Verify candidate uniqueness in database
  let exists = await db.order.findUnique({
    where: { orderNo: candidate },
    select: { id: true },
  });

  while (exists) {
    nextNum++;
    candidate = `${prefix}${String(nextNum).padStart(4, "0")}`;
    exists = await db.order.findUnique({
      where: { orderNo: candidate },
      select: { id: true },
    });
  }

  return candidate;
}

export async function nextInvoiceNo(tx?: any): Promise<string> {
  const db = tx ?? prisma;
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const invoices = await db.order.findMany({
    where: {
      invoiceNo: { startsWith: prefix },
    },
    select: { invoiceNo: true },
  });

  let maxNum = 0;
  for (const inv of invoices) {
    if (!inv.invoiceNo) continue;
    const suffix = inv.invoiceNo.replace(prefix, "").trim();
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${prefix}${String(nextNum).padStart(4, "0")}`;

  let exists = await db.order.findFirst({
    where: { invoiceNo: candidate },
    select: { id: true },
  });

  while (exists) {
    nextNum++;
    candidate = `${prefix}${String(nextNum).padStart(4, "0")}`;
    exists = await db.order.findFirst({
      where: { invoiceNo: candidate },
      select: { id: true },
    });
  }

  return candidate;
}

export interface OrderItemInput {
  productId: string;
  quantity?: number;
  cbm?: number;
}

// 1. Customer places order (Strictly order placement without pricing)
export async function placeCustomerOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN", "SALESMAN"].includes(session.role)) {
    redirect("/login");
  }

  const errorBase = session.role === "SALESMAN" ? "/salesman/orders/new" : "/customer/new-order";

  try {
    let deliveryAddress = String(formData.get("deliveryAddress") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const pincode = String(formData.get("pincode") ?? "").trim();
    const requestedDateRaw = String(formData.get("requestedDate") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;
    const itemsJson = String(formData.get("itemsJson") ?? "").trim();
    const rawAdhesiveBags = formData.get("adhesiveBags");
    const adhesiveBags = rawAdhesiveBags !== null ? Math.max(0, Math.floor(Number(rawAdhesiveBags) || 0)) : 0;

    // Google Maps & Custom Location Details
    let googleMapsUrl = String(formData.get("googleMapsUrl") ?? "").trim() || null;
    if (!googleMapsUrl && isGoogleMapsUrl(deliveryAddress)) {
      googleMapsUrl = deliveryAddress;
    }
    const googlePlaceId = String(formData.get("googlePlaceId") ?? "").trim() || null;
    const latitudeRaw = formData.get("latitude");
    const longitudeRaw = formData.get("longitude");
    const latitude = latitudeRaw && !isNaN(Number(latitudeRaw)) ? Number(latitudeRaw) : null;
    const longitude = longitudeRaw && !isNaN(Number(longitudeRaw)) ? Number(longitudeRaw) : null;
    const customSiteName = String(formData.get("customSiteName") ?? "").trim() || null;
    const villageArea = String(formData.get("villageArea") ?? "").trim() || null;
    const district = String(formData.get("district") ?? "").trim() || null;
    const state = String(formData.get("state") ?? "").trim() || "Gujarat";
    const nearbyLandmark = String(formData.get("nearbyLandmark") ?? "").trim() || null;
    const locationSource = String(formData.get("locationSource") ?? (googleMapsUrl ? "GOOGLE_MAPS_LINK" : googlePlaceId ? "GOOGLE_MAPS" : "MANUAL"));

    // GST Billing Option Fields
    const gstBillingRaw = String(formData.get("gstBilling") ?? formData.get("gstBillingSelected") ?? "no").toLowerCase();
    const gstBillingSelected = gstBillingRaw === "yes" || gstBillingRaw === "true";
    let gstNumber: string | null = null;
    let gstRegisteredName: string | null = null;
    let gstTradeName: string | null = null;
    let gstStatus: string | null = null;
    let gstState: string | null = null;

    if (gstBillingSelected) {
      const rawGst = String(formData.get("gstNumber") ?? "").trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
      if (!rawGst) {
        redirect(`${errorBase}?error=GST%20Number%20is%20required%20when%20GST%20Billing%20is%20selected`);
      }
      const gstResult = await verifyGstNumber(rawGst);
      if (!gstResult.valid) {
        redirect(`${errorBase}?error=${encodeURIComponent(gstResult.error || "Invalid GST Number format")}`);
      }
      gstNumber = gstResult.gstin;
      gstRegisteredName = gstResult.registeredName || gstResult.legalName || null;
      gstTradeName = gstResult.tradeName || null;
      gstStatus = gstResult.gstStatus || "Active";
      gstState = gstResult.state || null;
    }

    // Determine Customer and Salesman attribution
    let targetCustomerId = session.id;
    let targetSalesmanId: string | null = null;
    let targetSalesmanNameSnapshot: string | null = null;

    if (session.role === "SALESMAN") {
      const isNewCustomer = formData.get("isNewCustomer") === "true";
      if (isNewCustomer) {
        const newName = String(formData.get("newCustomerName") ?? "").trim();
        const newMobile = String(formData.get("newCustomerMobile") ?? "").trim().replace(/\D/g, "");
        const newEmail = String(formData.get("newCustomerEmail") ?? "").trim() || null;
        const newCompany = String(formData.get("newCustomerCompanyName") ?? "").trim() || null;
        const newAddress = String(formData.get("newCustomerAddress") ?? formData.get("deliveryAddress") ?? "").trim();
        const newCity = String(formData.get("newCustomerCity") ?? formData.get("city") ?? "").trim() || "Ahmedabad";
        const newState = String(formData.get("newCustomerState") ?? formData.get("state") ?? "").trim() || "Gujarat";
        const newPincode = String(formData.get("newCustomerPincode") ?? formData.get("pincode") ?? "").trim() || null;

        if (!newName || !newMobile || newMobile.length !== 10) {
          redirect("/salesman/orders/new?error=Please%20enter%20valid%20customer%20name%20and%2010-digit%20mobile%20number");
        }

        // Check if user already exists
        const existingCustomer = await prisma.user.findFirst({
          where: { mobile: newMobile },
        });

        if (existingCustomer) {
          if (existingCustomer.salesmanId === session.id) {
            // Already belongs to this salesman - reuse customer
            targetCustomerId = existingCustomer.id;
          } else if (existingCustomer.salesmanId && existingCustomer.salesmanId !== session.id) {
            // Belongs to another salesman! Block unauthorized reassignment
            redirect(
              "/salesman/orders/new?error=A%20customer%20with%20this%20mobile%20number%20already%20belongs%20to%20another%20Salesman.%20Only%20Super%20Admin%20can%20resolve%20customer%20ownership%20conflicts."
            );
          } else {
            // Unassigned customer: assign to current salesman
            await prisma.user.update({
              where: { id: existingCustomer.id },
              data: {
                salesmanId: session.id,
                assignedAt: new Date(),
              },
            });
            await prisma.customerAssignmentHistory.create({
              data: {
                customerId: existingCustomer.id,
                fromSalesmanId: existingCustomer.salesmanId || null,
                toSalesmanId: session.id,
                assignedById: session.id,
                reason: `Assigned during order creation by Salesman ${session.name}`,
              },
            });
            targetCustomerId = existingCustomer.id;
          }
        } else {
          // Create new customer account
          const tempPassword = crypto.randomBytes(12).toString("hex");
          const passwordHash = await bcrypt.hash(tempPassword, 10);
          const email = newEmail || `${newMobile}@swarnim.customer`;

          const newCustomer = await prisma.user.create({
            data: {
              name: newName,
              mobile: newMobile,
              email,
              passwordHash,
              role: "CUSTOMER",
              companyName: newCompany,
              deliveryAddress: newAddress,
              billingAddress: newAddress,
              city: newCity,
              state: newState,
              pincode: newPincode,
              salesmanId: session.id,
              assignedAt: new Date(),
              remarks: `Added by Salesman ${session.name} during order creation`,
              active: true,
            },
          });

          await prisma.customerAssignmentHistory.create({
            data: {
              customerId: newCustomer.id,
              fromSalesmanId: null,
              toSalesmanId: session.id,
              assignedById: session.id,
              reason: `Created and assigned during order creation by Salesman ${session.name}`,
            },
          });

          targetCustomerId = newCustomer.id;
        }
        targetSalesmanId = session.id;
        targetSalesmanNameSnapshot = session.name;
      } else {
        const rawCustomerId = String(formData.get("customerId") ?? "").trim();
        if (!rawCustomerId) {
          redirect("/salesman/orders/new?error=Please%20select%20an%20assigned%20customer");
        }
        const assignedCust = await prisma.user.findFirst({
          where: { id: rawCustomerId, salesmanId: session.id },
          select: { id: true, name: true, companyName: true },
        });
        if (!assignedCust) {
          redirect("/salesman/orders/new?error=Customer%20is%20not%20assigned%20to%20you");
        }
        targetCustomerId = assignedCust.id;
        targetSalesmanId = session.id;
        targetSalesmanNameSnapshot = session.name;
      }
    } else if (session.role === "CUSTOMER") {
      targetCustomerId = session.id;
      const cust = await prisma.user.findUnique({
        where: { id: session.id },
        select: { salesmanId: true, salesman: { select: { id: true, name: true } } },
      });
      if (cust?.salesmanId) {
        targetSalesmanId = cust.salesmanId;
        targetSalesmanNameSnapshot = cust.salesman?.name ?? null;
      }
    } else if (session.role === "ADMIN") {
      const rawCustomerId = String(formData.get("customerId") ?? "").trim();
      if (rawCustomerId) {
        targetCustomerId = rawCustomerId;
        const cust = await prisma.user.findUnique({
          where: { id: rawCustomerId },
          select: { salesmanId: true, salesman: { select: { id: true, name: true } } },
        });
        if (cust?.salesmanId) {
          targetSalesmanId = cust.salesmanId;
          targetSalesmanNameSnapshot = cust.salesman?.name ?? null;
        }
      }
    }

    // Append city and pincode to address if not already present and not a raw URL
    if (!isGoogleMapsUrl(deliveryAddress)) {
      if (city && !deliveryAddress.toLowerCase().includes(city.toLowerCase())) {
        deliveryAddress = `${deliveryAddress}, ${city}`;
      }
      if (pincode && !deliveryAddress.includes(pincode)) {
        deliveryAddress = `${deliveryAddress} - ${pincode}`;
      }
    }

    if (!deliveryAddress) {
      redirect(`${errorBase}?error=Delivery%20site%20address%20is%20required`);
    }

    const orderItemsToProcess: OrderItemInput[] = [];

    if (itemsJson) {
      try {
        const parsed = JSON.parse(itemsJson) as OrderItemInput[];
        if (Array.isArray(parsed)) {
          for (const it of parsed) {
            const qty = it.quantity ? Math.floor(it.quantity) : 0;
            const cbm = it.cbm ? Number(it.cbm) : 0;
            if (it.productId && (qty > 0 || cbm > 0)) {
              orderItemsToProcess.push({
                productId: it.productId,
                quantity: qty,
                cbm: cbm > 0 ? cbm : undefined,
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
      const primaryCbm = Number(formData.get("cbm") ?? 0);
      const primaryQuantity = Math.floor(Number(formData.get("quantity") ?? 0));
      if (primaryProductId && (primaryCbm > 0 || primaryQuantity > 0)) {
        orderItemsToProcess.push({
          productId: primaryProductId,
          quantity: primaryQuantity,
          cbm: primaryCbm > 0 ? primaryCbm : undefined,
        });
      }
    }

    // Ensure mortar / adhesive is added to items if adhesiveBags > 0
    const activeAdhesiveProduct = await prisma.product.findFirst({
      where: {
        category: { in: ["MORTAR", "ADHESIVE", "BLOCK_JOINTING_MORTAR"] },
        active: true,
        deletedAt: null,
      },
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
      redirect(`${errorBase}?error=Please%20select%20at%20least%20one%20product%20with%20valid%20quantity`);
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

      let itemQty = it.quantity ?? 0;

      if (prod.category === "AAC_BLOCK") {
        cbmPerUnit = Number(prod.cbmPerBlock) || 0;
        if (it.cbm && it.cbm > 0 && cbmPerUnit > 0) {
          totalCbm = Number(it.cbm.toFixed(4));
          itemQty = Math.round(totalCbm / cbmPerUnit);
        } else {
          totalCbm = Number((itemQty * cbmPerUnit).toFixed(4));
        }
        it.quantity = itemQty;
        // Formula: Blocks * (Length * Height / 1,000,000) * 10.7639104167 = Qty * 1.29166925
        sqftPerUnit = 1.29;
        totalSqft = Number((itemQty * 1.29166925).toFixed(2));
        combinedCbm += totalCbm;
        combinedSqft += totalSqft;
        totalBlocks += itemQty;
      } else if (prod.category === "ADHESIVE" || prod.category === "MORTAR" || prod.category === "BLOCK_JOINTING_MORTAR") {
        hasAdhesive = true;
      }

      resolvedItems.push({
        productId: prod.id,
        productType: prod.category,
        productName: prod.name,
        sizeLabel: prod.sizeLabel,
        dimensions: prod.dimensions,
        quantity: itemQty,
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

    const primaryItem = resolvedItems.find((it) => it.productType === "AAC_BLOCK") || resolvedItems[0];
    const aacBlockItems = resolvedItems.filter((it) => it.productType === "AAC_BLOCK");
    const blockSizesSummary = aacBlockItems.map((it) => formatBlockSizeName(it.sizeLabel)).join(", ") || formatBlockSizeName(primaryItem.sizeLabel);

    let order: any = null;
    let attempts = 0;
    while (!order && attempts < 5) {
      const orderNo = await nextOrderNo();
      try {
        order = await prisma.$transaction(async (tx) => {
          const ord = await tx.order.create({
            data: {
              orderNo,
              customerId: targetCustomerId,
              salesmanId: targetSalesmanId,
              salesmanNameSnapshot: targetSalesmanNameSnapshot,
              createdById: session.id,
              createdByRole: session.role,
              createdByNameSnapshot: session.name,
              googleMapsUrl,
              productId: primaryItem.productId,
              quantity: totalBlocks > 0 ? totalBlocks : primaryItem.quantity,
              rate: 0,
              gstRate: 0,
              subtotal: 0,
              gstAmount: 0,
              totalAmount: 0,
              totalCbm: combinedCbm > 0 ? Number(combinedCbm.toFixed(4)) : null,
              totalSqft: combinedSqft > 0 ? Number(combinedSqft.toFixed(2)) : null,
              hasMortar: adhesiveBags > 0,
              hasAdhesive,
              adhesiveBags,
              deliveryAddress,
              requestedDate: requestedDateRaw ? new Date(requestedDateRaw) : null,
              notes,
              status: OrderStatus.PENDING,
              version: 1,
              // GST Billing Details
              gstBillingSelected,
              gstNumber,
              gstRegisteredName,
              gstTradeName,
              gstStatus,
              gstState,
              googlePlaceId,
              latitude,
              longitude,
              formattedAddress: deliveryAddress,
              customSiteName,
              villageArea,
              city: city || null,
              district,
              state,
              pincode: pincode || null,
              nearbyLandmark,
              locationSource,
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
                  title: session.role === "SALESMAN" ? "New Order Created by Salesman" : "Order Placed",
                  note:
                    session.role === "SALESMAN"
                      ? `Order created by Salesman ${session.name}: ${combinedCbm.toFixed(3)} CBM (≈ ${totalBlocks.toLocaleString()} Blocks) + ${adhesiveBags} Bags Morter (40 KG)`
                      : `Order booked: ${combinedCbm.toFixed(3)} CBM (≈ ${totalBlocks.toLocaleString()} Blocks) + ${adhesiveBags} Bags Block Jointing Morter (40 KG)${
                          targetSalesmanNameSnapshot ? ` • Assigned Salesman: ${targetSalesmanNameSnapshot}` : ""
                        }`,
                  createdById: session.id,
                },
              },
            },
          });

          return ord;
        });
      } catch (txErr: any) {
        if (txErr?.code === "P2002" && txErr?.meta?.target?.includes("orderNo")) {
          attempts++;
          continue;
        }
        throw txErr;
      }
    }

    if (!order) {
      redirect(`${errorBase}?error=Could%20not%20generate%20a%20unique%20order%20number.%20Please%20try%20again.`);
    }

    // Real-Time Notifications
    const customer = await prisma.user.findUnique({
      where: { id: targetCustomerId },
      select: { name: true, companyName: true },
    });
    const customerName = customer?.companyName || customer?.name || "Customer";

    if (session.role === "SALESMAN") {
      // 1. Super Admin Notification
      await dispatchNotification({
        role: "ADMIN",
        title: "New Order Created by Salesman",
        message: `Salesman: ${session.name}\nCustomer: ${customerName}\nOrder ID: ${order.orderNo}\nTotal CBM: ${combinedCbm.toFixed(3)} CBM (≈ ${totalBlocks.toLocaleString()} Blocks)\nBlock Jointing Morter: ${adhesiveBags} Bags (40 KG)`,
        link: `/admin/orders/${order.id}`,
        orderId: order.id,
        type: "NEW_ORDER",
      });

      // 2. Salesman Notification
      await dispatchNotification({
        userId: session.id,
        title: "Customer Order Placed Successfully",
        message: `Customer: ${customerName}\nOrder ID: ${order.orderNo}\nStatus: New Order\nTotal CBM: ${combinedCbm.toFixed(3)} CBM (≈ ${totalBlocks.toLocaleString()} Blocks)`,
        link: `/salesman/orders/${order.id}`,
        orderId: order.id,
        type: "NEW_ORDER",
      });

      // 3. Customer Notification
      await dispatchNotification({
        userId: targetCustomerId,
        title: "Order Placed by Your Assigned Salesman",
        message: `Your assigned Salesman ${session.name} has placed an order (${order.orderNo}) on your behalf: ${combinedCbm.toFixed(3)} CBM (≈ ${totalBlocks.toLocaleString()} Blocks) + ${adhesiveBags} Bags Morter.`,
        link: `/customer/orders/${order.id}`,
        orderId: order.id,
        type: "NEW_ORDER",
      });
    } else {
      // Customer-Placed Order Notifications
      await dispatchNotification({
        role: "ADMIN",
        title: "New AAC Block Order Received",
        message: `Order ID: ${order.orderNo}\nBlock Size: ${blockSizesSummary}\nVolume: ${combinedCbm.toFixed(3)} CBM (≈ ${totalBlocks.toLocaleString()} Blocks)\nBlock Jointing Morter: ${adhesiveBags} Bags (40 KG)\nStatus: New Order\nCustomer: ${customerName}${
          targetSalesmanNameSnapshot ? `\nSalesman: ${targetSalesmanNameSnapshot}` : ""
        }`,
        link: `/admin/orders/${order.id}`,
        orderId: order.id,
        type: "NEW_ORDER",
      });

      // Notify the assigned Salesman if present
      if (targetSalesmanId) {
        await dispatchNotification({
          userId: targetSalesmanId,
          title: "New Order From Your Customer",
          message: `Order ID: ${order.orderNo}\nCustomer: ${customerName}\nBlock Size: ${blockSizesSummary}\nVolume: ${combinedCbm.toFixed(3)} CBM (≈ ${totalBlocks.toLocaleString()} Blocks)\nMorter: ${adhesiveBags} Bags`,
          link: `/salesman/orders/${order.id}`,
          orderId: order.id,
          type: "NEW_ORDER",
        });
      }

      // Notify the placing customer
      await dispatchNotification({
        userId: targetCustomerId,
        title: "Order Placed Successfully",
        message: `Your order ${order.orderNo} for ${combinedCbm.toFixed(3)} CBM (≈ ${totalBlocks.toLocaleString()} Blocks) has been placed. Block Jointing Morter: ${adhesiveBags} Bags (40 KG).`,
        link: `/customer/orders/${order.id}`,
        orderId: order.id,
        type: "STATUS_CHANGE",
      });
    }

    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/orders");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/orders");
    revalidatePath("/salesman/dashboard");
    revalidatePath("/salesman/orders");
    revalidatePath("/staff/dashboard");
    revalidatePath("/staff/orders");
    revalidatePath("/stocker/dashboard");
    revalidatePath("/stocker/orders");

    if (session.role === "SALESMAN") {
      redirect(`/salesman/orders/${order.id}?success=Order%20placed%20successfully`);
    }
    redirect(`/customer/orders/${order.id}?success=1`);
  } catch (err: any) {
    if (isRedirectError(err)) {
      throw err;
    }
    console.error("Critical error placing order:", err);
    redirect(`${errorBase}?error=${encodeURIComponent(err?.message || "Failed to place order. Please try again.")}`);
  }
}


// 2. Admin & Loading Staff confirms order
export async function confirmOrderAction(formData: FormData) {
  const session = await getSession();
  const isAuthorized =
    session && (session.role === "ADMIN" || session.role === "STAFF" || session.role === "STOCKER");
  if (!session || !isAuthorized) redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const returnUrl =
    session.role === "ADMIN"
      ? `/admin/orders/${orderId}`
      : session.role === "STOCKER"
      ? `/stocker/orders/${orderId}`
      : `/staff/orders/${orderId}`;

  // Concurrency protection: Atomic check and update within transaction
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { product: true, items: true, customer: true },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== OrderStatus.PENDING) {
      // Order was already confirmed by another user; prevent duplicate transition
      return { alreadyConfirmed: true, order, invoiceNo: order.invoiceNo, finalCbm: Number(order.totalCbm || 0) };
    }

    const quantity = Math.floor(Number(formData.get("quantity") ?? 0));
    const rate = Number(formData.get("rate") ?? 0);
    const cbmRaw = formData.get("cbm");
    const cbmPerBlock = Number(order.product?.cbmPerBlock || 0.018);
    let finalCbm = cbmRaw && Number(cbmRaw) > 0 ? Number(cbmRaw) : Number(order.totalCbm || 0);
    let finalQty = quantity > 0 ? quantity : order.quantity;

    if (cbmRaw && Number(cbmRaw) > 0 && cbmPerBlock > 0) {
      finalCbm = Number(cbmRaw);
      finalQty = Math.round(finalCbm / cbmPerBlock);
    } else if (quantity > 0 && cbmPerBlock > 0) {
      finalQty = quantity;
      finalCbm = Number((finalQty * cbmPerBlock).toFixed(4));
    }

    const finalRate = rate > 0 ? rate : Number(order.rate);

    let subtotal = order.subtotal;
    let gstAmount = order.gstAmount;
    let totalAmount = order.totalAmount;

    if (quantity > 0 || rate > 0 || (cbmRaw && Number(cbmRaw) > 0)) {
      const s = finalQty * finalRate;
      const g = s * (Number(order.gstRate) / 100);
      subtotal = s as any;
      gstAmount = g as any;
      totalAmount = (s + g) as any;
    }

    const invoiceNo = await nextInvoiceNo();
    const shareToken = crypto.randomBytes(24).toString("hex");
    const actorRoleLabel = session.role === "ADMIN" ? "Super Admin" : "Loading & Stock Staff";

    await tx.order.update({
      where: { id: orderId },
      data: {
        quantity: finalQty,
        totalCbm: finalCbm > 0 ? finalCbm : null,
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
            note: `Order confirmed by ${actorRoleLabel} (${session.name}) and Delivery Challan ${invoiceNo} generated`,
            createdById: session.id,
          },
        },
      },
    });

    return { alreadyConfirmed: false, order, invoiceNo, finalCbm };
  });

  if (result.alreadyConfirmed) {
    redirect(returnUrl);
  }

  const { order, invoiceNo, finalCbm } = result;

  // Notify customer
  if (order.customerId) {
    await dispatchNotification({
      userId: order.customerId,
      title: "Order Confirmed by Factory",
      message: `Order ${order.orderNo} has been confirmed. Challan: ${invoiceNo}`,
      link: `/customer/orders/${orderId}`,
      orderId,
      type: "STATUS_CHANGE",
    });
  }

  // Notify salesman
  if (order.salesmanId) {
    await dispatchNotification({
      userId: order.salesmanId,
      title: "Customer Order Confirmed",
      message: `Order ${order.orderNo} for customer ${order.customer?.name || "Customer"} was confirmed. Challan: ${invoiceNo}`,
      link: `/salesman/orders/${orderId}`,
      orderId,
      type: "STATUS_CHANGE",
    });
  }

  // Notify other role
  if (session.role !== "ADMIN") {
    // Staff confirmed: notify Super Admin
    await dispatchNotification({
      role: "ADMIN",
      title: "Order Confirmed by Loading Staff",
      message: `Order ${order.orderNo} for ${order.customer?.companyName || order.customer?.name || "Customer"} confirmed by ${session.name}. Challan: ${invoiceNo}. Ready for vehicle staging & loading.`,
      link: `/admin/orders/${orderId}`,
      orderId,
      type: "STATUS_CHANGE",
    });
  } else {
    // Admin confirmed: notify Loading & Stock Staff
    await dispatchNotification({
      role: "STAFF",
      title: "New Confirmed Order Ready for Loading",
      message: `Order ${order.orderNo} for ${order.customer?.companyName || order.customer?.name || "Customer"} is confirmed (${Number(finalCbm || order.totalCbm || 0).toFixed(3)} CBM). Ready for vehicle staging & loading.`,
      link: `/staff/orders/${orderId}`,
      orderId,
      type: "STATUS_CHANGE",
    });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/customer/orders");
  revalidatePath("/salesman/dashboard");
  revalidatePath("/salesman/orders");
  revalidatePath(`/salesman/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath("/staff/orders");
  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/stocker/orders");
  revalidatePath(`/stocker/orders/${orderId}`);

  redirect(returnUrl);
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

  if (order.assignedStaffId) {
    await dispatchNotification({
      userId: order.assignedStaffId,
      title: `Assigned Order Cancelled: ${order.orderNo}`,
      message: `Assigned Order ${order.orderNo} was cancelled/rejected: ${reason}`,
      link: `/staff/dashboard`,
      orderId,
      type: "STATUS_CHANGE",
    });
  }

  if (order.salesmanId) {
    await dispatchNotification({
      userId: order.salesmanId,
      title: "Customer Order Cancelled / Rejected",
      message: `Order ${order.orderNo} was cancelled/rejected: ${reason}`,
      link: `/salesman/orders/${orderId}`,
      orderId,
      type: "STATUS_CHANGE",
    });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/salesman/dashboard");
  revalidatePath("/salesman/orders");
  revalidatePath(`/salesman/orders/${orderId}`);
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
    message: `Order ID: ${order.orderNo}\nQuantity: ${formatNumber(order.quantity)} Blocks\nTotal CBM: ${Number(order.totalCbm || 0).toFixed(2)}\nBlock Jointing Morter: ${order.adhesiveBags ?? 0} Bags (40 KG)\nTruck: ${truckNumber}`,
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
  if (!session || !["ADMIN", "STAFF", "STOCKER"].includes(session.role)) redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  const redirectBase =
    session.role === "ADMIN"
      ? `/admin/orders/${orderId}`
      : session.role === "STOCKER"
      ? `/stocker/orders/${orderId}`
      : `/staff/orders/${orderId}`;

  if (!order) {
    const dashboardBase = session.role === "ADMIN" ? "/admin/orders" : session.role === "STOCKER" ? "/stocker/orders" : "/staff/dashboard";
    redirect(`${dashboardBase}?error=Order%20not%20found`);
  }

  if (order.status !== OrderStatus.ASSIGNED) {
    redirect(`${redirectBase}?error=Order%20is%20not%20in%20assigned%20state`);
  }

  // If unassigned, auto-assign this staff member
  if (!order.assignedStaffId && ["STAFF", "STOCKER"].includes(session.role)) {
    await prisma.order.update({
      where: { id: orderId },
      data: { assignedStaffId: session.id },
    });
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
  revalidatePath("/admin/orders");
  revalidatePath(`/stocker/orders/${orderId}`);
  revalidatePath("/stocker/orders");
  revalidatePath(`/customer/orders/${orderId}`);
  redirect(redirectBase);
}

// 6. Staff marks loading done with actual counted blocks / CBM
export async function completeLoadingAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STAFF", "STOCKER"].includes(session.role)) redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  const loadedQuantityRaw = formData.get("loadedQuantity");
  const loadedCbmRaw = formData.get("loadedCbm");
  const shortageReason = String(formData.get("shortageReason") ?? "").trim();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  const redirectBase =
    session.role === "ADMIN"
      ? `/admin/orders/${orderId}`
      : session.role === "STOCKER"
      ? `/stocker/orders/${orderId}`
      : `/staff/orders/${orderId}`;

  if (!order) {
    const dashboardBase = session.role === "ADMIN" ? "/admin/orders" : session.role === "STOCKER" ? "/stocker/orders" : "/staff/dashboard";
    redirect(`${dashboardBase}?error=Order%20not%20found`);
  }

  if (order.status !== OrderStatus.LOADING) {
    redirect(`${redirectBase}?error=Order%20is%20not%20in%20loading%20state`);
  }

  const cbmPerBlock = Number(order.product?.cbmPerBlock || 0.018);
  let loadedQuantity = Math.floor(Number(loadedQuantityRaw ?? 0));
  let loadedCbm = Number(loadedCbmRaw ?? 0);

  if (loadedCbm > 0 && loadedQuantity <= 0 && cbmPerBlock > 0) {
    loadedQuantity = Math.round(loadedCbm / cbmPerBlock);
  } else if (loadedQuantity > 0 && loadedCbm <= 0 && cbmPerBlock > 0) {
    loadedCbm = Number((loadedQuantity * cbmPerBlock).toFixed(4));
  }

  if (loadedQuantity <= 0 && loadedCbm <= 0) {
    redirect(`/staff/orders/${orderId}?error=Please%20enter%20a%20valid%20positive%20loaded%20quantity`);
  }

  if (loadedQuantity > order.quantity) {
    redirect(
      `/staff/orders/${orderId}?error=Loaded%20quantity%20(${loadedQuantity})%20cannot%20exceed%20ordered%20quantity%20(${order.quantity})`
    );
  }

  const isShortage = loadedQuantity < order.quantity;
  const shortageCbm = order.totalCbm ? Number(order.totalCbm) - loadedCbm : 0;
  const noteText = isShortage
    ? `Partially loaded: ${loadedCbm.toFixed(3)} CBM (≈ ${loadedQuantity.toLocaleString()} blocks) / ${Number(order.totalCbm || 0).toFixed(3)} CBM (Shortage of ${shortageCbm.toFixed(3)} CBM / ${(
        order.quantity - loadedQuantity
      ).toLocaleString()} blocks). Note: ${shortageReason || "Truck capacity limit"}`
    : `${loadedCbm.toFixed(3)} CBM (≈ ${loadedQuantity.toLocaleString()} blocks) physically verified and loaded into truck by ${session.name}`;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.LOADED,
      loadedQuantity,
      loadedCbm: loadedCbm > 0 ? loadedCbm : null,
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
    message: `Order ${order.orderNo} loaded (${loadedCbm.toFixed(3)} CBM, ≈ ${loadedQuantity.toLocaleString()} blocks counted). Ready for gate out.`,
    link: `/admin/orders/${orderId}`,
    orderId,
    type: "STATUS_CHANGE",
  });

  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/stocker/orders/${orderId}`);
  revalidatePath("/stocker/orders");
  revalidatePath(`/customer/orders/${orderId}`);
  redirect(redirectBase);
}

// 7. Admin dispatches loaded order (Automatic Stock Out with CBM stock check)
export async function dispatchOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STAFF", "STOCKER"].includes(session.role)) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true, items: true, transport: true },
  });

  const returnPath =
    session.role === "ADMIN"
      ? `/admin/orders/${orderId}`
      : session.role === "STOCKER"
      ? `/stocker/orders/${orderId}`
      : `/staff/orders/${orderId}`;

  if (!order) {
    redirect(`${returnPath}?error=Order%20not%20found`);
  }

  if (order.status === OrderStatus.DISPATCHED || order.status === OrderStatus.DELIVERED) {
    redirect(`${returnPath}?error=Order%20has%20already%20been%20dispatched`);
  }

  if (order.status === OrderStatus.PENDING || order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
    redirect(`${returnPath}?error=Order%20must%20be%20confirmed%20and%20staged%20before%20dispatch`);
  }

  // Deduct stock for all items
  const itemsToDeduct = order.items.length > 0
    ? order.items.map((it) => {
        const isBlock = it.productType === "AAC_BLOCK";
        const cbmPerUnit = Number(it.cbmPerUnit || 0);
        let qty = it.loadedQuantity && it.loadedQuantity > 0 ? it.loadedQuantity : it.quantity;
        let cbm = it.loadedCbm && Number(it.loadedCbm) > 0 ? Number(it.loadedCbm) : Number(it.totalCbm || 0);
        if (isBlock && cbm <= 0 && cbmPerUnit > 0) {
          cbm = Number((qty * cbmPerUnit).toFixed(4));
        }
        return {
          productId: it.productId,
          productType: it.productType,
          qty,
          cbm,
          cbmPerUnit,
        };
      })
    : order.productId
    ? [
        {
          productId: order.productId,
          productType: order.product?.category || "AAC_BLOCK",
          qty: order.loadedQuantity && order.loadedQuantity > 0 ? order.loadedQuantity : order.quantity,
          cbm: order.loadedCbm && Number(order.loadedCbm) > 0 ? Number(order.loadedCbm) : Number(order.totalCbm || 0),
          cbmPerUnit: Number(order.product?.cbmPerBlock || 0),
        },
      ]
    : [];

  // Check stock for each item before deducting
  for (const it of itemsToDeduct) {
    if (it.productType === "AAC_BLOCK") {
      const currentCbm = await getProductCbm(it.productId);
      const reqCbm = it.cbm > 0 ? it.cbm : (it.cbmPerUnit > 0 ? Number((it.qty * it.cbmPerUnit).toFixed(4)) : 0);
      it.cbm = reqCbm;
      // Precision margin 0.0001
      if (currentCbm < reqCbm - 0.0001) {
        redirect(
          `${returnPath}?error=Not%20enough%20stock%20for%20product.%20Available:%20${currentCbm.toFixed(3)}%20CBM,%20required:%20${reqCbm.toFixed(3)}%20CBM.`
        );
      }
    } else {
      const currentStock = await getProductStock(it.productId);
      if (currentStock < it.qty) {
        redirect(
          `${returnPath}?error=Not%20enough%20stock%20for%20mortar/accessory.%20Available:%20${currentStock}%20bags,%20required:%20${it.qty}%20bags.`
        );
      }
    }
  }

  const dcNumber = order.dcNumber || (await getNextDeliveryChallanNumber());

  // Automatic Stock Out movements in transaction
  await prisma.$transaction(async (tx) => {
    for (const it of itemsToDeduct) {
      await tx.stockMovement.create({
        data: {
          productId: it.productId,
          orderId: order.id,
          type: StockType.OUT,
          quantityDelta: -it.qty,
          cbmDelta: it.cbm > 0 ? -it.cbm : null,
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
        dcNumber,
        events: {
          create: {
            status: OrderStatus.DISPATCHED,
            title: "Order Dispatched",
            note: `Delivery Challan ${dcNumber} issued • Truck ${order.transport?.truckNumber || ""} left the factory yard • Deducted from inventory`,
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

  // Notify assigned staff of dispatch status change
  if (order.assignedStaffId) {
    await dispatchNotification({
      userId: order.assignedStaffId,
      title: "Dispatch Status Changed",
      message: `Order ${order.orderNo} has been dispatched from factory yard. Delivery Challan: ${dcNumber}.`,
      link: `/staff/orders/${orderId}`,
      orderId,
      type: "DISPATCH",
    });
  }

  if (order.salesmanId) {
    await dispatchNotification({
      userId: order.salesmanId,
      title: "Customer Order Dispatched",
      message: `Order ${order.orderNo} has been dispatched. Truck ${order.transport?.truckNumber || ""} is on its way. Challan: ${dcNumber}.`,
      link: `/salesman/orders/${orderId}`,
      orderId,
      type: "DISPATCH",
    });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/admin/stock");
  revalidatePath("/stocker/stock");
  revalidatePath("/admin/dashboard");
  revalidatePath("/staff/dashboard");
  revalidatePath("/salesman/dashboard");
  revalidatePath("/salesman/orders");
  revalidatePath(`/salesman/orders/${orderId}`);
  redirect(returnPath);
}

// 8. Admin & Authorized Loading Staff mark material delivered
export async function deliverOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STAFF", "STOCKER"].includes(session.role)) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "");
  const returnPath =
    session.role === "ADMIN"
      ? `/admin/orders/${orderId}`
      : session.role === "STOCKER"
      ? `/stocker/orders/${orderId}`
      : `/staff/orders/${orderId}`;

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
      events: {
        create: {
          status: OrderStatus.DELIVERED,
          title: "Order Delivered",
          note: `Material delivery confirmed by ${session.name} (${session.role})`,
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

  if (order.assignedStaffId) {
    await dispatchNotification({
      userId: order.assignedStaffId,
      title: "Delivery Completed",
      message: `Order ${order.orderNo} has been confirmed delivered at customer site.`,
      link: `/staff/orders/${orderId}`,
      orderId,
      type: "DELIVERED",
    });
  }

  if (order.salesmanId) {
    await dispatchNotification({
      userId: order.salesmanId,
      title: "Customer Order Delivered",
      message: `Order ${order.orderNo} has been confirmed delivered at customer site.`,
      link: `/salesman/orders/${orderId}`,
      orderId,
      type: "DELIVERED",
    });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath(`/stocker/orders/${orderId}`);
  revalidatePath("/stocker/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/salesman/dashboard");
  revalidatePath("/salesman/orders");
  revalidatePath(`/salesman/orders/${orderId}`);
  redirect(returnPath);
}

// 8B. Loader, Stocker & Admin: One-Click Complete & Mark Order Done (Independent of Super Admin)
export async function markOrderDoneAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STAFF", "STOCKER"].includes(session.role)) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  const returnPath =
    session.role === "ADMIN"
      ? `/admin/orders/${orderId}`
      : session.role === "STOCKER"
      ? `/stocker/orders/${orderId}`
      : `/staff/orders/${orderId}`;

  if (!orderId) {
    redirect(returnPath);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true, items: true, transport: true },
  });

  if (!order) {
    redirect(`${returnPath}?error=Order%20not%20found`);
  }

  if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
    redirect(`${returnPath}?error=Cannot%20complete%20a%20cancelled%20or%20rejected%20order`);
  }

  if (order.status === OrderStatus.DELIVERED) {
    redirect(`${returnPath}?success=Order%20is%20already%20marked%20Done`);
  }

  const now = new Date();
  const confirmedAt = order.confirmedAt || now;
  const dispatchedAt = order.dispatchedAt || now;
  const dcNumber = order.dcNumber || (await getNextDeliveryChallanNumber());

  // If not yet dispatched, deduct inventory stock
  if (order.status !== OrderStatus.DISPATCHED) {
    const itemsToDeduct =
      order.items && order.items.length > 0
        ? order.items.map((it) => {
            const isBlock = it.productType === "AAC_BLOCK";
            const cbmPerUnit = Number(it.cbmPerUnit || 0);
            let qty = it.loadedQuantity && it.loadedQuantity > 0 ? it.loadedQuantity : it.quantity;
            let cbm = it.loadedCbm && Number(it.loadedCbm) > 0 ? Number(it.loadedCbm) : Number(it.totalCbm || 0);
            if (isBlock && cbm <= 0 && cbmPerUnit > 0) {
              cbm = Number((qty * cbmPerUnit).toFixed(4));
            }
            return {
              productId: it.productId,
              productType: it.productType,
              qty,
              cbm,
            };
          })
        : order.productId
        ? [
            {
              productId: order.productId,
              productType: order.product?.category || "AAC_BLOCK",
              qty: order.loadedQuantity && order.loadedQuantity > 0 ? order.loadedQuantity : order.quantity,
              cbm: order.loadedCbm && Number(order.loadedCbm) > 0 ? Number(order.loadedCbm) : Number(order.totalCbm || 0),
            },
          ]
        : [];

    await prisma.$transaction(async (tx) => {
      for (const it of itemsToDeduct) {
        if (it.productId && (it.qty > 0 || it.cbm > 0)) {
          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              orderId: order.id,
              type: StockType.OUT,
              quantityDelta: -it.qty,
              cbmDelta: it.cbm > 0 ? -it.cbm : null,
              referenceNo: order.orderNo,
              note: `Stock out on order Done & delivery of ${order.orderNo}`,
              createdById: session.id,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERED,
          confirmedAt,
          dispatchedAt,
          deliveredAt: now,
          dcNumber,
          events: {
            create: [
              ...(!order.dispatchedAt
                ? [
                    {
                      status: OrderStatus.DISPATCHED,
                      title: "Order Dispatched",
                      note: `Truck ${order.transport?.truckNumber || ""} cleared from yard by ${session.name} (${session.role})`,
                      createdById: session.id,
                    },
                  ]
                : []),
              {
                status: OrderStatus.DELIVERED,
                title: "Order Done & Delivered",
                note: `Order execution marked Done and site delivery verified by ${session.name} (${session.role})`,
                createdById: session.id,
              },
            ],
          },
        },
      });
    });
  } else {
    // Already dispatched, mark delivered directly
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: now,
        events: {
          create: {
            status: OrderStatus.DELIVERED,
            title: "Order Done & Delivered",
            note: `Site delivery confirmed and order marked Done by ${session.name} (${session.role})`,
            createdById: session.id,
          },
        },
      },
    });
  }

  // Real-time notifications
  await dispatchNotification({
    userId: order.customerId,
    title: "Order Completed & Delivered",
    message: `Your order ${order.orderNo} has been completed and delivered. Delivery Challan: ${dcNumber}.`,
    link: `/customer/orders/${orderId}`,
    orderId,
    type: "DELIVERED",
  });

  await dispatchNotification({
    role: "ADMIN",
    title: `Order Done: ${order.orderNo}`,
    message: `Order ${order.orderNo} completed & marked Done by ${session.name} (${session.role}).`,
    link: `/admin/orders/${orderId}`,
    orderId,
    type: "DELIVERED",
  });

  if (order.salesmanId) {
    await dispatchNotification({
      userId: order.salesmanId,
      title: "Customer Order Completed",
      message: `Order ${order.orderNo} has been completed & delivered at site.`,
      link: `/salesman/orders/${orderId}`,
      orderId,
      type: "DELIVERED",
    });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath(`/stocker/orders/${orderId}`);
  revalidatePath("/stocker/orders");
  revalidatePath(`/customer/orders/${orderId}`);
  revalidatePath("/customer/orders");
  revalidatePath("/admin/stock");
  revalidatePath("/stocker/stock");

  redirect(`${returnPath}?success=Order%20marked%20Done%20and%20Delivered%20successfully`);
}

// Safe Super Admin Delete / Archive functionality
export async function deleteOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { movements: true },
  });

  if (!order) {
    redirect("/admin/orders?error=Order%20not%20found");
  }

  // Legal retention safeguard: Cannot permanently delete dispatched or delivered orders with stock movements
  if (order.status === OrderStatus.DISPATCHED || order.status === OrderStatus.DELIVERED || order.movements.length > 0) {
    redirect("/admin/orders?error=Cannot%20delete%20dispatched%20or%20delivered%20orders%20with%20inventory%20movements.%20Use%20Archive%20instead.");
  }

  await prisma.order.delete({
    where: { id: orderId },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath("/staff/dashboard");
  revalidatePath("/salesman/orders");
  redirect("/admin/orders?success=Order%20deleted%20successfully");
}

export async function archiveOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || "Archived by Super Admin";

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    redirect("/admin/orders?error=Order%20not%20found");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.CANCELLED,
      events: {
        create: {
          status: OrderStatus.CANCELLED,
          title: "Order Archived / Cancelled",
          note: reason,
          createdById: session.id,
        },
      },
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/dashboard");
  redirect("/admin/orders?success=Order%20archived%20successfully");
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

// ============================================================================
// 9. Customer Edits Order Before Dispatch (with Audit History & Notifications)
// ============================================================================
export async function editCustomerOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN", "SALESMAN"].includes(session.role)) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      customer: true,
      assignedStaff: true,
    },
  });

  if (!existingOrder) {
    redirect("/customer/orders?error=Order%20not%20found");
  }

  // Security guard: Customers can only edit their own orders
  if (session.role === "CUSTOMER" && existingOrder.customerId !== session.id) {
    redirect("/customer/orders?error=Unauthorized%20access%20to%20order");
  }

  // Security guard: Salesmen can only edit their assigned customers' orders
  if (session.role === "SALESMAN" && existingOrder.salesmanId !== session.id) {
    redirect("/salesman/orders?error=Unauthorized%20access%20to%20order");
  }

  // Strict backend status check: Only editable before dispatch!
  const nonEditableStatuses: OrderStatus[] = [
    OrderStatus.DISPATCHED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REJECTED,
  ];

  if (nonEditableStatuses.includes(existingOrder.status)) {
    redirect(
      `/customer/orders/${orderId}?error=Order%20cannot%20be%20edited%20after%20it%20has%20been%20dispatched%20or%20delivered`
    );
  }

  let deliveryAddress = String(formData.get("deliveryAddress") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const itemsJson = String(formData.get("itemsJson") ?? "").trim();
  const rawAdhesiveBags = formData.get("adhesiveBags");
  const adhesiveBags = rawAdhesiveBags !== null ? Math.max(0, Math.floor(Number(rawAdhesiveBags) || 0)) : 0;

  // Google Maps & Custom Location Details
  let googleMapsUrl = String(formData.get("googleMapsUrl") ?? "").trim() || null;
  if (!googleMapsUrl && isGoogleMapsUrl(deliveryAddress)) {
    googleMapsUrl = deliveryAddress;
  }
  const googlePlaceId = String(formData.get("googlePlaceId") ?? "").trim() || null;
  const latitudeRaw = formData.get("latitude");
  const longitudeRaw = formData.get("longitude");
  const latitude = latitudeRaw && !isNaN(Number(latitudeRaw)) ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw && !isNaN(Number(longitudeRaw)) ? Number(longitudeRaw) : null;
  const customSiteName = String(formData.get("customSiteName") ?? "").trim() || null;

  // GST Billing Option Fields
  const gstBillingRaw = String(formData.get("gstBilling") ?? formData.get("gstBillingSelected") ?? (existingOrder.gstBillingSelected ? "yes" : "no")).toLowerCase();
  const gstBillingSelected = gstBillingRaw === "yes" || gstBillingRaw === "true";
  let gstNumber: string | null = null;
  let gstRegisteredName: string | null = null;
  let gstTradeName: string | null = null;
  let gstStatus: string | null = null;
  let gstState: string | null = null;

  if (gstBillingSelected) {
    const rawGst = String(formData.get("gstNumber") ?? existingOrder.gstNumber ?? "").trim();
    if (rawGst) {
      const gstResult = await verifyGstNumber(rawGst);
      if (gstResult.valid) {
        gstNumber = gstResult.gstin;
        gstRegisteredName = gstResult.registeredName || gstResult.legalName || null;
        gstTradeName = gstResult.tradeName || null;
        gstStatus = gstResult.gstStatus || "Active";
        gstState = gstResult.state || null;
      } else {
        gstNumber = rawGst.toUpperCase();
      }
    }
  }
  const villageArea = String(formData.get("villageArea") ?? "").trim() || null;
  const district = String(formData.get("district") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || "Gujarat";
  const nearbyLandmark = String(formData.get("nearbyLandmark") ?? "").trim() || null;
  const locationSource = String(formData.get("locationSource") ?? (googleMapsUrl ? "GOOGLE_MAPS_LINK" : googlePlaceId ? "GOOGLE_MAPS" : "MANUAL"));

  if (!isGoogleMapsUrl(deliveryAddress)) {
    if (city && !deliveryAddress.toLowerCase().includes(city.toLowerCase())) {
      deliveryAddress = `${deliveryAddress}, ${city}`;
    }
    if (pincode && !deliveryAddress.includes(pincode)) {
      deliveryAddress = `${deliveryAddress} - ${pincode}`;
    }
  }

  if (!deliveryAddress) {
    redirect(`/customer/orders/${orderId}/edit?error=Delivery%20site%20address%20is%20required`);
  }

  const orderItemsToProcess: OrderItemInput[] = [];
  if (itemsJson) {
    try {
      const parsed = JSON.parse(itemsJson) as OrderItemInput[];
      if (Array.isArray(parsed)) {
        for (const it of parsed) {
          const qty = it.quantity ? Math.floor(it.quantity) : 0;
          const cbm = it.cbm ? Number(it.cbm) : 0;
          if (it.productId && (qty > 0 || cbm > 0)) {
            orderItemsToProcess.push({
              productId: it.productId,
              quantity: qty,
              cbm: cbm > 0 ? cbm : undefined,
            });
          }
        }
      }
    } catch {}
  }

  // Ensure mortar / adhesive is added if adhesiveBags > 0
  const activeAdhesiveProduct = await prisma.product.findFirst({
    where: {
      category: { in: ["MORTAR", "ADHESIVE", "BLOCK_JOINTING_MORTAR"] },
      active: true,
      deletedAt: null,
    },
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
    redirect(`/customer/orders/${orderId}/edit?error=Please%20select%20at%20least%20one%20product%20with%20valid%20quantity`);
  }

  // Resolve products and recalculate
  let combinedCbm = 0;
  let totalBlocks = 0;
  let hasAdhesive = adhesiveBags > 0;

  const resolvedItems: any[] = [];
  for (const it of orderItemsToProcess) {
    const product = await prisma.product.findUnique({ where: { id: it.productId } });
    if (!product) continue;

    const isAacBlock = product.category === "AAC_BLOCK";
    const cbmPerBlock = Number(product.cbmPerBlock || 0.018);
    let itemQty = it.quantity ?? 0;
    let itemCbm = it.cbm ?? 0;

    if (isAacBlock) {
      if (itemCbm > 0 && itemQty <= 0 && cbmPerBlock > 0) {
        itemQty = Math.ceil(itemCbm / cbmPerBlock);
      } else if (itemQty > 0 && itemCbm <= 0 && cbmPerBlock > 0) {
        itemCbm = Number((itemQty * cbmPerBlock).toFixed(4));
      } else if (itemCbm > 0 && cbmPerBlock > 0) {
        itemQty = Math.ceil(itemCbm / cbmPerBlock);
        itemCbm = Number((itemQty * cbmPerBlock).toFixed(4));
      }
      totalBlocks += itemQty;
      combinedCbm += itemCbm;
    } else {
      hasAdhesive = true;
    }

    resolvedItems.push({
      productId: product.id,
      productType: product.category,
      productName: product.name,
      sizeLabel: product.sizeLabel,
      dimensions: product.dimensions,
      quantity: itemQty,
      cbmPerUnit: isAacBlock && cbmPerBlock > 0 ? cbmPerBlock : null,
      totalCbm: isAacBlock && itemCbm > 0 ? Number(itemCbm.toFixed(4)) : null,
      rate: 0,
      gstRate: 0,
      subtotal: 0,
      gstAmount: 0,
      totalAmount: 0,
    });
  }

  const primaryItem = resolvedItems.find((it) => it.productType === "AAC_BLOCK") || resolvedItems[0];

  // Compare previous values with new values to track audit history
  const changedFields: string[] = [];
  const prevCbm = Number(existingOrder.totalCbm || 0);
  if (Math.abs(prevCbm - combinedCbm) > 0.001) changedFields.push("Total CBM");
  if (existingOrder.quantity !== totalBlocks) changedFields.push("Block Quantity");
  if (existingOrder.adhesiveBags !== adhesiveBags) changedFields.push("Block Jointing Morter");
  if (existingOrder.deliveryAddress !== deliveryAddress) changedFields.push("Delivery Address");
  if (existingOrder.notes !== notes) changedFields.push("Site Notes");
  if (existingOrder.googlePlaceId !== googlePlaceId) changedFields.push("Maps Location");

  const prevSnapshot = {
    totalCbm: prevCbm,
    quantity: existingOrder.quantity,
    adhesiveBags: existingOrder.adhesiveBags,
    deliveryAddress: existingOrder.deliveryAddress,
    notes: existingOrder.notes,
    googlePlaceId: existingOrder.googlePlaceId,
    items: existingOrder.items.map((i) => ({
      sizeLabel: i.sizeLabel,
      quantity: i.quantity,
      totalCbm: i.totalCbm ? Number(i.totalCbm) : null,
    })),
  };

  const newSnapshot = {
    totalCbm: Number(combinedCbm.toFixed(3)),
    quantity: totalBlocks,
    adhesiveBags,
    deliveryAddress,
    notes,
    googlePlaceId,
    items: resolvedItems.map((i) => ({
      sizeLabel: i.sizeLabel,
      quantity: i.quantity,
      totalCbm: i.totalCbm,
    })),
  };

  const newVersion = (existingOrder.version || 1) + 1;

  await prisma.$transaction(async (tx) => {
    // 1. Delete old line items
    await tx.orderItem.deleteMany({ where: { orderId } });

    // 2. Insert new line items
    await tx.orderItem.createMany({
      data: resolvedItems.map((it) => ({
        orderId,
        productId: it.productId,
        productType: it.productType,
        productName: it.productName,
        sizeLabel: it.sizeLabel,
        dimensions: it.dimensions,
        quantity: it.quantity,
        cbmPerUnit: it.cbmPerUnit,
        totalCbm: it.totalCbm,
        rate: 0,
        gstRate: 0,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
      })),
    });

    // 3. Update order record
    await tx.order.update({
      where: { id: orderId },
      data: {
        productId: primaryItem.productId,
        quantity: totalBlocks > 0 ? totalBlocks : primaryItem.quantity,
        totalCbm: combinedCbm > 0 ? Number(combinedCbm.toFixed(4)) : null,
        hasMortar: adhesiveBags > 0,
        hasAdhesive,
        adhesiveBags,
        deliveryAddress,
        notes,
        googleMapsUrl: googleMapsUrl || existingOrder.googleMapsUrl,
        googlePlaceId,
        latitude,
        longitude,
        formattedAddress: deliveryAddress,
        customSiteName,
        villageArea,
        city: city || null,
        district,
        state,
        pincode: pincode || null,
        nearbyLandmark,
        locationSource,
        version: newVersion,
        gstBillingSelected,
        gstNumber,
        gstRegisteredName,
        gstTradeName,
        gstStatus,
        gstState,
        events: {
          create: {
            status: existingOrder.status,
            title: session.role === "SALESMAN" ? "Order Updated by Salesman" : "Order Updated by Customer",
            note: `Order v${newVersion} modified by ${
              session.role === "SALESMAN" ? `Salesman ${session.name}` : "Customer"
            }: ${combinedCbm.toFixed(3)} CBM (≈ ${totalBlocks.toLocaleString()} blocks), ${adhesiveBags} bags mortar. Changes: ${
              changedFields.join(", ") || "Specifications refreshed"
            }`,
            createdById: session.id,
          },
        },
      },
    });

    // 4. Save immutable audit entry
    await tx.orderEditHistory.create({
      data: {
        orderId,
        changedById: session.id,
        changedByName: session.name,
        userRole: session.role,
        previousValues: prevSnapshot,
        newValues: newSnapshot,
        changedFields,
        orderVersion: newVersion,
      },
    });
  });

  // Notify Admin
  await dispatchNotification({
    role: "ADMIN",
    title: session.role === "SALESMAN" ? `Order Updated by Salesman: ${existingOrder.orderNo}` : `Order Updated by Customer: ${existingOrder.orderNo}`,
    message: `${session.role === "SALESMAN" ? `Salesman ${session.name}` : "Customer"} modified ${existingOrder.orderNo}. Volume: ${combinedCbm.toFixed(3)} CBM (Prev: ${prevCbm.toFixed(3)} CBM). Changed: ${
      changedFields.join(", ") || "Details"
    }`,
    link: `/admin/orders/${orderId}`,
    orderId,
    type: "ORDER_UPDATED",
  });

  // If order was already assigned to staff or in loading, notify staff immediately
  if (existingOrder.assignedStaffId) {
    await dispatchNotification({
      userId: existingOrder.assignedStaffId,
      title: `ALERT: Assigned Order ${existingOrder.orderNo} Updated`,
      message: `${session.role === "SALESMAN" ? `Salesman ${session.name}` : "Customer"} updated Order ${existingOrder.orderNo} specifications. Please re-verify loading count! New CBM: ${combinedCbm.toFixed(3)} CBM`,
      link: `/staff/orders/${orderId}`,
      orderId,
      type: "ORDER_UPDATED",
    });
  }

  // Notify assigned Salesman if customer edited
  if (session.role !== "SALESMAN" && existingOrder.salesmanId) {
    await dispatchNotification({
      userId: existingOrder.salesmanId,
      title: `ALERT: Order ${existingOrder.orderNo} Updated`,
      message: `Customer updated Order ${existingOrder.orderNo} specifications. Volume: ${combinedCbm.toFixed(3)} CBM (Prev: ${prevCbm.toFixed(3)} CBM).`,
      link: `/salesman/orders/${orderId}`,
      orderId,
      type: "ORDER_UPDATED",
    });
  }

  // Notify Customer if salesman edited
  if (session.role === "SALESMAN" && existingOrder.customerId) {
    await dispatchNotification({
      userId: existingOrder.customerId,
      title: "Order Updated by Your Assigned Salesman",
      message: `Your assigned Salesman ${session.name} updated your Order ${existingOrder.orderNo}. New Volume: ${combinedCbm.toFixed(3)} CBM.`,
      link: `/customer/orders/${orderId}`,
      orderId,
      type: "ORDER_UPDATED",
    });
  }

  revalidatePath(`/customer/orders/${orderId}`);
  revalidatePath(`/customer/orders/${orderId}/edit`);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath("/salesman/dashboard");
  revalidatePath("/salesman/orders");
  revalidatePath(`/salesman/orders/${orderId}`);

  if (session.role === "SALESMAN") {
    redirect(`/salesman/orders/${orderId}?success=Order%20updated%20successfully`);
  }
  redirect(`/customer/orders/${orderId}?success=Order%20updated%20successfully`);
}

// ============================================================================
// 10. Weighbridge Slip / Vajan Slip Management (Only Net Weight)
// ============================================================================
export async function saveWeighbridgeSlipAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STAFF", "STOCKER"].includes(session.role)) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  const rstNumber = String(formData.get("rstNumber") ?? "").trim();
  const receiptNumber = String(formData.get("receiptNumber") ?? "").trim() || null;
  const weighbridgeName = String(formData.get("weighbridgeName") ?? "").trim() || "Swarnim Plant Weighbridge";
  const slipDateRaw = String(formData.get("slipDate") ?? "").trim();
  const slipTime = String(formData.get("slipTime") ?? "").trim() || null;
  const vehicleNumber = String(formData.get("vehicleNumber") ?? "").trim().toUpperCase();
  const driverName = String(formData.get("driverName") ?? "").trim();
  const driverMobile = String(formData.get("driverMobile") ?? "").trim();
  const netWeightKg = Number(formData.get("netWeightKg") || formData.get("netWeight") || 0);
  const remarks = String(formData.get("remarks") ?? "").trim() || null;
  const slipUrl = String(formData.get("slipUrl") ?? "").trim() || null;
  const fileType = String(formData.get("fileType") ?? "").trim() || null;
  const fileName = String(formData.get("fileName") ?? "").trim() || null;

  const redirectBase =
    session.role === "ADMIN"
      ? `/admin/orders/${orderId}`
      : session.role === "STOCKER"
      ? `/stocker/orders/${orderId}`
      : `/staff/orders/${orderId}`;

  if (!orderId || !rstNumber || !vehicleNumber) {
    redirect(`${redirectBase}?error=RST%20Number%20and%20Vehicle%20Number%20are%20required`);
  }

  if (isNaN(netWeightKg) || netWeightKg <= 0) {
    redirect(`${redirectBase}?error=Please%20enter%20a%20valid%20positive%20Net%20Weight%20in%20KG`);
  }

  const targetOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      status: true,
      version: true,
      weighbridgeSlip: true,
    },
  });

  if (!targetOrder) {
    const dashboardBase = session.role === "ADMIN" ? "/admin/orders" : session.role === "STOCKER" ? "/stocker/orders" : "/staff/dashboard";
    redirect(`${dashboardBase}?error=Order%20not%20found`);
  }

  // Prevent unauthorized weight modifications after dispatch
  if (["DISPATCHED", "DELIVERED", "CANCELLED"].includes(targetOrder.status)) {
    redirect(`${redirectBase}?error=Weight%20modifications%20are%20locked%20after%20dispatch`);
  }

  const previousSlip = targetOrder.weighbridgeSlip;
  const previousNetWeight = previousSlip?.netWeightKg ? Number(previousSlip.netWeightKg) : null;
  const isCorrection = previousNetWeight !== null && previousNetWeight !== netWeightKg;
  const slipDate = slipDateRaw ? new Date(slipDateRaw) : new Date();

  await prisma.$transaction(async (tx) => {
    // Upsert WeighbridgeSlip with Net Weight
    await tx.weighbridgeSlip.upsert({
      where: { orderId },
      create: {
        orderId,
        rstNumber,
        receiptNumber,
        weighbridgeName,
        slipDate,
        slipTime,
        vehicleNumber,
        driverName,
        driverMobile,
        netWeightKg,
        remarks,
        slipUrl,
        fileType,
        fileName,
        createdById: session.id,
      },
      update: {
        rstNumber,
        receiptNumber,
        weighbridgeName,
        slipDate,
        slipTime,
        vehicleNumber,
        driverName,
        driverMobile,
        netWeightKg,
        remarks,
        ...(slipUrl ? { slipUrl, fileType, fileName } : {}),
      },
    });

    // Sync or create Transport details
    if (vehicleNumber) {
      await tx.transport.upsert({
        where: { orderId },
        create: {
          orderId,
          truckNumber: vehicleNumber,
          driverName: driverName || "Assigned Driver",
          driverMobile: driverMobile || "9879500000",
        },
        update: {
          truckNumber: vehicleNumber,
          ...(driverName ? { driverName } : {}),
          ...(driverMobile ? { driverMobile } : {}),
        },
      });
    }

    // Sync Net Weight to LoadingRecord if present
    await tx.loadingRecord.upsert({
      where: { orderId },
      create: {
        orderId,
        driverName: driverName || "Assigned Driver",
        driverMobile: driverMobile || "9879500000",
        vehicleNumber,
        rstNumber,
        netWeight: netWeightKg,
        createdById: session.id,
      },
      update: {
        rstNumber,
        netWeight: netWeightKg,
        ...(driverName ? { driverName } : {}),
        ...(driverMobile ? { driverMobile } : {}),
        vehicleNumber,
      },
    });

    // Add audit history event
    if (isCorrection) {
      await tx.orderEditHistory.create({
        data: {
          orderId,
          changedById: session.id,
          changedByName: session.name,
          userRole: session.role,
          previousValues: {
            field: "weighbridgeSlip.netWeightKg",
            previousNetWeightKg: previousNetWeight,
            rstNumber: previousSlip?.rstNumber,
          },
          newValues: {
            field: "weighbridgeSlip.netWeightKg",
            newNetWeightKg: netWeightKg,
            rstNumber,
          },
          changedFields: ["weighbridgeSlip.netWeightKg"],
          orderVersion: targetOrder.version ?? 1,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          status: targetOrder.status,
          title: "Weighbridge Net Weight Corrected",
          note: `Net Weight revised: ${previousNetWeight?.toLocaleString()} KG → ${netWeightKg.toLocaleString()} KG • RST #${rstNumber} by ${session.name}`,
          createdById: session.id,
        },
      });
    } else {
      await tx.orderEvent.create({
        data: {
          orderId,
          status: targetOrder.status === OrderStatus.ASSIGNED ? OrderStatus.LOADED : targetOrder.status,
          title: "Weighbridge Net Weight Recorded",
          note: `RST #${rstNumber} • Net Weight: ${netWeightKg.toLocaleString()} KG • Vehicle: ${vehicleNumber}`,
          createdById: session.id,
        },
      });
    }
  });

  // Notify Admin
  await dispatchNotification({
    role: "ADMIN",
    title: isCorrection ? "Weighbridge Net Weight Corrected" : "Weighbridge Net Weight Recorded",
    message: `Weighbridge slip RST #${rstNumber} updated. Verified Net Weight: ${netWeightKg.toLocaleString()} KG for truck ${vehicleNumber}.`,
    link: `/admin/orders/${orderId}`,
    orderId,
    type: "WEIGHBRIDGE_RECORDED",
  });

  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/stocker/orders/${orderId}`);
  revalidatePath("/stocker/orders");
  revalidatePath(`/customer/orders/${orderId}`);
  redirect(`${redirectBase}?success=Weighbridge%20Net%20Weight%20saved%20successfully`);
}

// ============================================================================
// 11. Loading & Vehicle Details Entry
// ============================================================================
export async function saveLoadingAndVehicleAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STAFF", "STOCKER"].includes(session.role)) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  const driverName = String(formData.get("driverName") ?? "").trim();
  const driverMobile = String(formData.get("driverMobile") ?? "").trim();
  const vehicleNumber = String(formData.get("vehicleNumber") ?? "").trim().toUpperCase();
  const transporterName = String(formData.get("transporterName") ?? "").trim() || null;
  const vehicleType = String(formData.get("vehicleType") ?? "").trim() || null;
  const loadingStartTime = String(formData.get("loadingStartTime") ?? "").trim() || null;
  const loadingEndTime = String(formData.get("loadingEndTime") ?? "").trim() || null;
  const loadedBlockSize = String(formData.get("loadedBlockSize") ?? "").trim() || null;
  const loadedCbm = Number(formData.get("loadedCbm") || 0);
  const loadedMortarBags = Number(formData.get("loadedMortarBags") || 0);
  const rstNumber = String(formData.get("rstNumber") ?? "").trim() || null;
  const netWeightInput = Number(formData.get("netWeight") || formData.get("netWeightKg") || 0);
  const remarks = String(formData.get("remarks") ?? "").trim() || null;

  const redirectBase =
    session.role === "ADMIN"
      ? `/admin/orders/${orderId}`
      : session.role === "STOCKER"
      ? `/stocker/orders/${orderId}`
      : `/staff/orders/${orderId}`;

  if (!orderId || !vehicleNumber || !driverName) {
    redirect(`${redirectBase}?error=Driver%20Name%20and%20Vehicle%20Number%20are%20required`);
  }

  const netWeight = netWeightInput > 0 ? netWeightInput : null;

  await prisma.$transaction(async (tx) => {
    // Upsert LoadingRecord
    await tx.loadingRecord.upsert({
      where: { orderId },
      create: {
        orderId,
        driverName,
        driverMobile,
        vehicleNumber,
        transporterName,
        vehicleType,
        loadingStartTime,
        loadingEndTime,
        loadedBlockSize,
        loadedCbm: loadedCbm > 0 ? loadedCbm : null,
        loadedMortarBags,
        rstNumber,
        netWeight,
        remarks,
        createdById: session.id,
      },
      update: {
        driverName,
        driverMobile,
        vehicleNumber,
        transporterName,
        vehicleType,
        loadingStartTime,
        loadingEndTime,
        loadedBlockSize,
        loadedCbm: loadedCbm > 0 ? loadedCbm : null,
        loadedMortarBags,
        rstNumber,
        ...(netWeight !== null ? { netWeight } : {}),
        remarks,
      },
    });

    // Sync Transport
    await tx.transport.upsert({
      where: { orderId },
      create: {
        orderId,
        truckNumber: vehicleNumber,
        driverName,
        driverMobile,
        transporterName,
      },
      update: {
        truckNumber: vehicleNumber,
        driverName,
        driverMobile,
        transporterName,
      },
    });
  });

  // Notify Admin of loading & vehicle details update
  await dispatchNotification({
    role: "ADMIN",
    title: "Loading & Vehicle Details Updated",
    message: `Vehicle ${vehicleNumber} details recorded for Order by ${session.name}. Driver: ${driverName}.`,
    link: `/admin/orders/${orderId}`,
    orderId,
    type: "STATUS_CHANGE",
  });

  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/stocker/orders/${orderId}`);
  revalidatePath("/stocker/orders");
  redirect(`${redirectBase}?success=Loading%20and%20vehicle%20details%20saved`);
}

// ============================================================================
// 12. Shared Truck Staging & Loading Details (Used by Super Admin & Staff)
// ============================================================================
export async function saveTruckAndLoadingStagingAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STAFF", "STOCKER"].includes(session.role)) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  const rawStaffId = String(formData.get("staffId") ?? "").trim();
  const truckNumber = String(formData.get("truckNumber") ?? "").trim().toUpperCase();
  const driverName = String(formData.get("driverName") ?? "").trim();
  const driverMobile = String(formData.get("driverMobile") ?? "").trim();
  const transporterName = String(formData.get("transporterName") ?? "").trim() || null;
  const expectedDeliveryRaw = String(formData.get("expectedDelivery") ?? "").trim();
  const loadingStartTime = String(formData.get("loadingStartTime") ?? "").trim() || null;
  const loadingEndTime = String(formData.get("loadingEndTime") ?? "").trim() || null;
  const loadedCbmRaw = formData.get("loadedCbm");
  const loadedCbm = loadedCbmRaw && !isNaN(Number(loadedCbmRaw)) && Number(loadedCbmRaw) > 0 ? Number(loadedCbmRaw) : null;
  const netWeightRaw = formData.get("netWeightKg") || formData.get("netWeight");
  const netWeightKg = netWeightRaw && !isNaN(Number(netWeightRaw)) && Number(netWeightRaw) > 0 ? Number(netWeightRaw) : null;
  const rstNumber = String(formData.get("rstNumber") ?? "").trim() || null;
  const remarks = String(formData.get("remarks") ?? "").trim() || null;

  const returnPath =
    session.role === "ADMIN"
      ? `/admin/orders/${orderId}`
      : session.role === "STOCKER"
      ? `/stocker/orders/${orderId}`
      : `/staff/orders/${orderId}`;

  if (!orderId) {
    redirect("/login");
  }

  if (!truckNumber || !driverName || !driverMobile) {
    redirect(`${returnPath}?error=Truck%20Registration,%20Driver%20Name,%20and%20Mobile%20are%20required`);
  }

  // Validate mobile (10 digits)
  const cleanMobile = driverMobile.replace(/[^0-9]/g, "");
  if (cleanMobile.length < 10) {
    redirect(`${returnPath}?error=Please%20enter%20a%20valid%2010-digit%20driver%20mobile%20number`);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      transport: true,
      weighbridgeSlip: true,
      loadingRecord: true,
      customer: true,
    },
  });

  if (!order) {
    redirect(`${returnPath}?error=Order%20not%20found`);
  }

  // Determine assigned staff ID
  let targetStaffId = order.assignedStaffId;
  if (session.role === "ADMIN") {
    if (rawStaffId) targetStaffId = rawStaffId;
  } else {
    // For STAFF/STOCKER: if self-assigning or order was unassigned, claim it
    if (!targetStaffId || rawStaffId === session.id) {
      targetStaffId = session.id;
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1. Upsert Transport
    await tx.transport.upsert({
      where: { orderId },
      create: {
        orderId,
        truckNumber,
        driverName,
        driverMobile: cleanMobile,
        transporterName,
        expectedDelivery: expectedDeliveryRaw ? new Date(expectedDeliveryRaw) : null,
        assignedAt: new Date(),
      },
      update: {
        truckNumber,
        driverName,
        driverMobile: cleanMobile,
        transporterName,
        ...(expectedDeliveryRaw ? { expectedDelivery: new Date(expectedDeliveryRaw) } : {}),
      },
    });

    // 2. Upsert LoadingRecord
    await tx.loadingRecord.upsert({
      where: { orderId },
      create: {
        orderId,
        vehicleNumber: truckNumber,
        driverName,
        driverMobile: cleanMobile,
        transporterName,
        loadingStartTime,
        loadingEndTime,
        loadedCbm: loadedCbm || (order.totalCbm ? Number(order.totalCbm) : null),
        netWeight: netWeightKg,
        rstNumber,
        remarks,
        createdById: session.id,
      },
      update: {
        vehicleNumber: truckNumber,
        driverName,
        driverMobile: cleanMobile,
        transporterName,
        ...(loadingStartTime ? { loadingStartTime } : {}),
        ...(loadingEndTime ? { loadingEndTime } : {}),
        ...(loadedCbm !== null ? { loadedCbm } : {}),
        ...(netWeightKg !== null ? { netWeight: netWeightKg } : {}),
        ...(rstNumber ? { rstNumber } : {}),
        ...(remarks ? { remarks } : {}),
      },
    });

    // 3. Upsert WeighbridgeSlip if Net Weight or RST provided
    if (netWeightKg !== null || rstNumber) {
      await tx.weighbridgeSlip.upsert({
        where: { orderId },
        create: {
          orderId,
          rstNumber: rstNumber || `RST-${Date.now().toString().slice(-4)}`,
          vehicleNumber: truckNumber,
          driverName,
          driverMobile: cleanMobile,
          weighbridgeName: "Swarnim Plant Weighbridge",
          netWeightKg: netWeightKg || 0,
          remarks,
          createdById: session.id,
        },
        update: {
          vehicleNumber: truckNumber,
          driverName,
          driverMobile: cleanMobile,
          ...(netWeightKg !== null ? { netWeightKg } : {}),
          ...(rstNumber ? { rstNumber } : {}),
          ...(remarks ? { remarks } : {}),
        },
      });
    }

    // 4. Update order status if it was CONFIRMED -> advance to ASSIGNED
    const nextStatus = order.status === OrderStatus.CONFIRMED ? OrderStatus.ASSIGNED : order.status;

    await tx.order.update({
      where: { id: orderId },
      data: {
        assignedStaffId: targetStaffId,
        status: nextStatus,
        loadedCbm: loadedCbm || order.loadedCbm,
        version: { increment: 1 },
        events: {
          create: {
            status: nextStatus,
            title: "Truck Staged & Details Updated",
            note: `Truck: ${truckNumber} • Driver: ${driverName} (${cleanMobile})${
              netWeightKg ? ` • Net Wt: ${netWeightKg.toLocaleString()} KG` : ""
            }${targetStaffId ? ` • Staff Assigned` : ""}`,
            createdById: session.id,
          },
        },
      },
    });

    // 5. Audit history record
    await tx.orderEditHistory.create({
      data: {
        orderId,
        changedById: session.id,
        changedByName: session.name,
        userRole: session.role,
        previousValues: {
          truckNumber: order.transport?.truckNumber,
          driverName: order.transport?.driverName,
          driverMobile: order.transport?.driverMobile,
          assignedStaffId: order.assignedStaffId,
          netWeight: order.loadingRecord?.netWeight || (order.weighbridgeSlip?.netWeightKg ? Number(order.weighbridgeSlip.netWeightKg) : null),
        },
        newValues: {
          truckNumber,
          driverName,
          driverMobile: cleanMobile,
          assignedStaffId: targetStaffId,
          netWeight: netWeightKg,
        },
        changedFields: ["transport", "driver", "vehicleStaging"],
        orderVersion: (order.version || 1) + 1,
      },
    });
  }, { timeout: 20000, maxWait: 10000 });

  // Notifications
  if (session.role === "ADMIN" && targetStaffId && targetStaffId !== session.id) {
    await dispatchNotification({
      userId: targetStaffId,
      title: "Loading Task Assigned",
      message: `Order ${order.orderNo} staged with Truck ${truckNumber}. Driver: ${driverName}. Volume: ${Number(order.totalCbm || 0).toFixed(3)} CBM`,
      link: `/staff/orders/${orderId}`,
      orderId,
      type: "STATUS_CHANGE",
    });
  } else if (session.role !== "ADMIN") {
    await dispatchNotification({
      role: "ADMIN",
      title: `Truck Details Updated: ${order.orderNo}`,
      message: `${session.name} updated vehicle details for ${order.orderNo}: Truck ${truckNumber}, Driver ${driverName}${
        netWeightKg ? `, Net Wt: ${netWeightKg.toLocaleString()} KG` : ""
      }`,
      link: `/admin/orders/${orderId}`,
      orderId,
      type: "STATUS_CHANGE",
    });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath("/stocker/orders");
  revalidatePath(`/stocker/orders/${orderId}`);
  revalidatePath(`/invoice/${orderId}`);

  redirect(`${returnPath}?success=Truck%20and%20loading%20details%20saved%20successfully`);
}

// ============================================================================
// 13. Staff Self-Claiming Confirmed Order from Yard Queue
// ============================================================================
export async function claimOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["STAFF", "STOCKER"].includes(session.role)) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) redirect("/staff/dashboard");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNo: true, status: true, assignedStaffId: true, totalCbm: true },
  });

  if (!order) redirect("/staff/dashboard?error=Order%20not%20found");

  // Concurrency-safe atomic claim: update only if unassigned or already claimed by current user
  const updateResult = await prisma.order.updateMany({
    where: {
      id: orderId,
      OR: [
        { assignedStaffId: null },
        { assignedStaffId: session.id },
      ],
    },
    data: {
      assignedStaffId: session.id,
      status: order.status === OrderStatus.CONFIRMED ? OrderStatus.ASSIGNED : order.status,
    },
  });

  if (updateResult.count === 0) {
    redirect(`/staff/dashboard?error=Order%20was%20already%20claimed%20by%20another%20staff%20member`);
  }

  // Create audit event
  await prisma.orderEvent.create({
    data: {
      orderId,
      status: order.status === OrderStatus.CONFIRMED ? OrderStatus.ASSIGNED : order.status,
      title: "Order Claimed by Staff",
      note: `Staff member ${session.name} accepted loading responsibility for ${order.orderNo}`,
      createdById: session.id,
    },
  });

  await dispatchNotification({
    role: "ADMIN",
    title: `Order Claimed: ${order.orderNo}`,
    message: `Staff member ${session.name} has claimed Order ${order.orderNo} for yard staging and loading.`,
    link: `/admin/orders/${orderId}`,
    orderId,
    type: "STATUS_CHANGE",
  });

  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/staff/dashboard");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/staff/orders/${orderId}?success=Order%20claimed%20successfully`);
}

// ============================================================================
// 14. Atomic Delivery Challan Document Generation
// ============================================================================
export async function generateDeliveryChallanAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMIN", "STAFF", "STOCKER"].includes(session.role)) {
    redirect("/login");
  }

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) redirect("/login");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNo: true, dcNumber: true, invoiceNo: true, status: true },
  });

  if (!order) redirect("/login");

  const returnPath = session.role === "ADMIN" ? `/admin/orders/${orderId}` : `/staff/orders/${orderId}`;

  let dcNumber = order.dcNumber;
  let invoiceNo = order.invoiceNo;

  if (!dcNumber) {
    dcNumber = await getNextDeliveryChallanNumber();
  }
  if (!invoiceNo) {
    invoiceNo = await nextInvoiceNo();
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      dcNumber,
      invoiceNo,
      events: {
        create: {
          status: order.status,
          title: "Delivery Challan Generated",
          note: `Official Delivery Challan ${dcNumber} (${invoiceNo}) generated by ${session.name}`,
          createdById: session.id,
        },
      },
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath(`/invoice/${orderId}`);

  redirect(`${returnPath}?success=Delivery%20Challan%20${dcNumber}%20generated%20successfully`);
}



