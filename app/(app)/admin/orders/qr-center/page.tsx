import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { serializeForClient } from "@/lib/utils";
import { OrderQrDashboard, QrDashboardOrder } from "@/components/order-qr-dashboard";
import { QrCode, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOrderQrCenterPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  // 1. Fetch Orders with QR relations and scan/share counts
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          mobile: true,
          companyName: true,
        },
      },
      qrCode: {
        include: {
          _count: {
            select: {
              scanLogs: true,
              shareLogs: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Compute Metric Statistics
  const totalOrders = orders.length;
  let activeQrs = 0;
  let revokedQrs = 0;
  let expiredQrs = 0;
  let ordersWithoutQr = 0;
  let totalScans = 0;
  let totalShares = 0;

  for (const o of orders) {
    if (!o.qrCode) {
      ordersWithoutQr++;
    } else {
      if (o.qrCode.status === "ACTIVE") activeQrs++;
      else if (o.qrCode.status === "REVOKED") revokedQrs++;
      else if (o.qrCode.status === "EXPIRED") expiredQrs++;

      totalScans += o.qrCode._count?.scanLogs || 0;
      totalShares += o.qrCode._count?.shareLogs || 0;
    }
  }

  const serializedOrders: QrDashboardOrder[] = orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    totalCbm: o.totalCbm ? Number(o.totalCbm) : null,
    quantity: o.quantity,
    customer: o.customer,
    qrCode: o.qrCode
      ? {
          id: o.qrCode.id,
          token: o.qrCode.token,
          status: o.qrCode.status,
          createdAt: o.qrCode.createdAt.toISOString(),
          _count: o.qrCode._count,
        }
      : null,
  }));

  const stats = {
    totalOrders,
    ordersWithQr: totalOrders - ordersWithoutQr,
    ordersWithoutQr,
    activeQrs,
    revokedQrs,
    expiredQrs,
    totalScans,
    totalShares,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition shadow-2xs"
            title="Back to All Orders"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Order QR Code Control Center
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-extrabold text-[#13789B] border border-teal-200">
                <ShieldCheck className="h-3 w-3" />
                <span>Super Admin</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate, monitor, audit, share, and revoke encrypted order QR verification codes
            </p>
          </div>
        </div>

        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition"
        >
          <span>All Orders Table</span>
        </Link>
      </div>

      {/* Main Interactive Dashboard */}
      <OrderQrDashboard
        orders={serializeForClient(serializedOrders)}
        stats={stats}
      />
    </div>
  );
}
