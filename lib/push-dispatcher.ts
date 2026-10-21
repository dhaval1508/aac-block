import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@swarnimaac.com";

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error("Failed to initialize web-push VAPID details:", err);
  }
}

export interface DispatchNotificationParams {
  userId?: string | null;
  role?: Role;
  title: string;
  message: string;
  link?: string;
  orderId?: string;
  type?: string; // "NEW_ORDER" | "ORDER_ASSIGNED" | "STATUS_CHANGE" | "DISPATCH"
}

export async function dispatchNotification({
  userId,
  role,
  title,
  message,
  link,
  orderId,
  type = "GENERAL",
}: DispatchNotificationParams) {
  try {
    // 1. Create In-App Notification in Neon PostgreSQL
    const notification = await prisma.notification.create({
      data: {
        userId: userId || null,
        role: role || null,
        title,
        message,
        link: link || null,
        orderId: orderId || null,
        type,
      },
    });

    // 2. Locate applicable Web Push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: userId
        ? { userId }
        : role
        ? {
            user: {
              role: role === "STAFF" || role === "STOCKER" ? { in: ["STAFF", "STOCKER"] } : role,
            },
          }
        : {},
    });

    if (subscriptions.length === 0) {
      return { success: true, notificationId: notification.id, pushed: 0 };
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-72.png",
      data: {
        url: link || (orderId ? `/orders/${orderId}` : "/"),
        notificationId: notification.id,
      },
    });

    let sentCount = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );

        sentCount++;
        await prisma.notificationDeliveryLog.create({
          data: {
            notificationId: notification.id,
            userId: sub.userId,
            endpoint: sub.endpoint,
            status: "SUCCESS",
            statusCode: 201,
          },
        });
      } catch (pushErr: any) {
        console.warn(`Push dispatch failed for endpoint ${sub.endpoint}:`, pushErr?.message);

        // If subscription has expired or unsubscribed, remove it
        if (pushErr?.statusCode === 410 || pushErr?.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }

        await prisma.notificationDeliveryLog.create({
          data: {
            notificationId: notification.id,
            userId: sub.userId,
            endpoint: sub.endpoint,
            status: "FAILED",
            statusCode: pushErr?.statusCode || 500,
            error: pushErr?.message || "Unknown error",
          },
        });
      }
    }

    return { success: true, notificationId: notification.id, pushed: sentCount };
  } catch (err: any) {
    console.error("Error dispatching notification:", err);
    return { success: false, error: err?.message };
  }
}
