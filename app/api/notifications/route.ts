import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleCondition =
    session.role === "STAFF" || session.role === "STOCKER"
      ? { in: ["STAFF", "STOCKER"] as Role[] }
      : session.role;

  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        { userId: session.id },
        { role: roleCondition },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      read: false,
      OR: [
        { userId: session.id },
        { role: roleCondition },
      ],
    },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    const roleCondition =
      session.role === "STAFF" || session.role === "STOCKER"
        ? { in: ["STAFF", "STOCKER"] as Role[] }
        : session.role;

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          read: false,
          OR: [
            { userId: session.id },
            { role: roleCondition },
          ],
        },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing parameter" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
