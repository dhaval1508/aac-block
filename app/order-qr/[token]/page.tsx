import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/company-profile";
import { serializeForClient } from "@/lib/utils";
import { recordOrderQrScan } from "@/lib/actions/order-qr";
import { OrderQrView } from "@/components/order-qr-view";
import {
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  Phone,
  Building2,
  Clock,
  ArrowLeft,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrderQrScanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Extract client metadata for audit logging
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") || "";
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : headerList.get("x-real-ip") || "";

  // 1. Record Scan and check QR validity
  const scanResult = await recordOrderQrScan(token, userAgent, ipAddress);

  const companyProfile = await getCompanyProfile();

  // 2. Handle NOT FOUND State
  if (!scanResult || scanResult.reason === "NOT_FOUND") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 text-center shadow-lg space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <XCircle className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-extrabold">
              Verification Failed
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Order QR Code Not Found
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              The scanned QR code is either invalid, damaged, or does not exist in the official Swarnim AAC Block system.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 text-left space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Building2 className="h-4 w-4 text-[#13789B]" />
              <span>{companyProfile.legalName || "SWARNIM AAC BLOCK PRIVATE LIMITED"}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              For order verification or dispatch assistance, please contact plant administration:
            </p>
            <a
              href={`tel:${companyProfile.companyMobile || "+917698787476"}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#13789B] hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Plant Helpline: {companyProfile.companyMobile || "+91 7698787476"}</span>
            </a>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Swarnim AAC Portal</span>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Handle REVOKED State
  if (scanResult.reason === "REVOKED") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-white border border-rose-200 p-6 sm:p-8 text-center shadow-lg space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-rose-600 font-extrabold">
              Security Notice
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Order QR Code Revoked
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              This QR code was revoked or superseded by factory administration. Access to this specific QR link has been permanently disabled.
            </p>
          </div>

          {scanResult.revokedReason && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-900 text-left space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-600 block">Revocation Reason</span>
              <p className="font-semibold">{scanResult.revokedReason}</p>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 text-left space-y-2">
            <p className="text-[11px] text-slate-500">
              If you require an updated QR code or digital delivery challan, please contact plant logistics:
            </p>
            <a
              href={`tel:${companyProfile.companyMobile || "+917698787476"}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#13789B] hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Plant Helpline: {companyProfile.companyMobile || "+91 7698787476"}</span>
            </a>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Swarnim AAC Portal</span>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Handle EXPIRED State
  if (scanResult.reason === "EXPIRED") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-white border border-amber-200 p-6 sm:p-8 text-center shadow-lg space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Clock className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-amber-600 font-extrabold">
              Link Expired
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Order QR Code Validity Expired
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              The designated validity timeframe for this order QR code has expired.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 text-left space-y-2">
            <p className="text-[11px] text-slate-500">
              For an updated order tracking link or document copy, contact factory logistics:
            </p>
            <a
              href={`tel:${companyProfile.companyMobile || "+917698787476"}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#13789B] hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Plant Helpline: {companyProfile.companyMobile || "+91 7698787476"}</span>
            </a>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Swarnim AAC Portal</span>
          </Link>
        </div>
      </div>
    );
  }

  // 5. Fetch Full Order Details for Active QR
  const order = await prisma.order.findUnique({
    where: { id: scanResult.orderId },
    include: {
      customer: true,
      product: true,
      salesman: true,
      transport: true,
      assignedStaff: true,
      weighbridgeSlip: true,
      loadingRecord: true,
      qrCode: true,
      items: {
        include: {
          product: true,
        },
        orderBy: { createdAt: "asc" },
      },
      events: {
        orderBy: { createdAt: "asc" },
      },
      payments: {
        orderBy: { paidAt: "desc" },
      },
    },
  });

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-white p-8 text-center shadow space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h1 className="text-xl font-black">Order Record Missing</h1>
          <p className="text-xs text-slate-500">The referenced order data could not be located.</p>
        </div>
      </div>
    );
  }

  const serializedOrder = serializeForClient(order);

  return (
    <OrderQrView
      order={serializedOrder}
      companyProfile={serializeForClient(companyProfile)}
      qrDetails={{
        token,
        status: order.qrCode?.status || "ACTIVE",
        accessPolicy: order.qrCode?.accessPolicy || "PUBLIC_READONLY",
        createdAt: order.qrCode?.createdAt?.toISOString() || order.createdAt.toISOString(),
        scannedAt: new Date().toISOString(),
        verified: true,
      }}
    />
  );
}
