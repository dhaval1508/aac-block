import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { changePasswordAction } from "@/lib/actions/auth";
import {
  User,
  Phone,
  Mail,
  Shield,
  Key,
  Users,
  ShoppingBag,
  Layers,
  Calendar,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalesmanProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; pwdSuccess?: string; pwdError?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== Role.SALESMAN && session.role !== Role.ADMIN)) {
    redirect("/login");
  }

  const { success, error, pwdSuccess, pwdError } = await searchParams;

  const salesman = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      assignedCustomers: { select: { id: true } },
      salesmanOrders: { select: { id: true, totalCbm: true } },
    },
  });

  if (!salesman) {
    redirect("/login");
  }

  const totalCbm = salesman.salesmanOrders.reduce(
    (acc, o) => acc + (o.totalCbm ? Number(o.totalCbm) : 0),
    0
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-navy">My Profile</h1>
        <p className="mt-1 text-xs text-slate-500">
          Your private salesman account credentials and performance metrics.
        </p>
      </div>

      {(success || pwdSuccess) && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success || pwdSuccess}</span>
        </div>
      )}

      {(error || pwdError) && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700">
          <span>{error || pwdError}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#13789B] text-white text-xl font-black shadow-md">
            {salesman.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black rounded-lg bg-sky-50 text-[#13789B] border border-sky-200 px-2 py-0.5">
                {salesman.salesmanCode || "SAB-SALES"}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Active Sales Representative
              </span>
            </div>
            <h2 className="mt-1 text-xl font-black text-navy">{salesman.name}</h2>
            <p className="text-xs text-slate-500">{salesman.companyName || "Swarnim AAC Block Pvt. Ltd."}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Phone className="h-4 w-4 text-slate-400" />
            <span>Mobile: <strong>{salesman.mobile}</strong></span>
          </div>

          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Mail className="h-4 w-4 text-slate-400" />
            <span>Email: <strong>{salesman.email}</strong></span>
          </div>

          {(salesman.deliveryAddress || salesman.billingAddress) && (
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>Territory: <strong>{salesman.deliveryAddress || salesman.billingAddress}</strong></span>
            </div>
          )}

          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Member since: <strong>{formatDate(salesman.createdAt)}</strong></span>
          </div>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs text-center">
          <Users className="mx-auto h-5 w-5 text-purple-600 mb-1" />
          <span className="text-[10px] font-bold uppercase text-slate-500 block">My Customers</span>
          <p className="text-xl font-black text-navy mt-1">{salesman.assignedCustomers.length}</p>
        </div>

        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs text-center">
          <ShoppingBag className="mx-auto h-5 w-5 text-amber-600 mb-1" />
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Customer Orders</span>
          <p className="text-xl font-black text-navy mt-1">{salesman.salesmanOrders.length}</p>
        </div>

        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs text-center">
          <Layers className="mx-auto h-5 w-5 text-emerald-600 mb-1" />
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Volume</span>
          <p className="text-xl font-black text-navy mt-1">{totalCbm.toFixed(2)} CBM</p>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Key className="h-4 w-4 text-[#13789B]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-navy">
            Change Login Password
          </h3>
        </div>

        <form action={changePasswordAction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Current Password *
            </label>
            <input
              name="currentPassword"
              type="password"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password (Min 6 chars) *
              </label>
              <input
                name="newPassword"
                type="password"
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-2xl bg-[#13789B] hover:bg-[#0f607d] px-5 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
