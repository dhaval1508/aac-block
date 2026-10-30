import { redirect } from "next/navigation";
import { User, Building2, MapPin, KeyRound, LogOut, CheckCircle, AlertCircle, Shield } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { changePasswordAction, logoutAction, updateCustomerProfileAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    success?: string;
    pwdError?: string;
    pwdSuccess?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || !["CUSTOMER", "ADMIN"].includes(session.role)) redirect("/login");

  const { error, success, pwdError, pwdSuccess } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      salesman: {
        select: {
          name: true,
          mobile: true,
          email: true,
          salesmanCode: true,
        },
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto space-y-4 sm:space-y-6 min-w-0 max-w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-navy">Customer Profile & Company Settings</h1>
        <p className="text-sm text-slate-500">
          Manage your contact credentials, company GST details, delivery destinations, and account security.
        </p>
      </div>

      {/* Assigned Salesman Card */}
      <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/70 via-indigo-50/30 to-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600 text-white font-bold shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-purple-800 tracking-wider">
                Assigned Sales Representative
              </span>
              <p className="text-sm font-black text-navy mt-0.5">
                {user.salesman ? user.salesman.name : "Factory Direct Customer (Unassigned)"}
              </p>
              {user.salesman?.mobile && (
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Direct Line: {user.salesman.mobile} {user.salesman.email ? `• ${user.salesman.email}` : ""}
                </p>
              )}
            </div>
          </div>
          {user.salesman?.salesmanCode && (
            <span className="hidden sm:inline-block rounded-lg bg-white border border-purple-200 px-2.5 py-1 text-xs font-mono font-bold text-purple-800">
              {user.salesman.salesmanCode}
            </span>
          )}
        </div>
      </div>

      {/* Profile Form Feedback */}
      {error ? (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>Profile details updated successfully and saved to database!</span>
        </div>
      ) : null}

      {/* 1. Company & Contact Details */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm min-w-0">
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
          <Building2 className="h-5 w-5 text-[#1e72a8]" />
          <div>
            <h2 className="text-base font-bold text-navy">Company & Contact Information</h2>
            <p className="text-xs text-slate-400">Used for official orders, delivery challans, and dispatch logistics.</p>
          </div>
        </div>

        <form action={updateCustomerProfileAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Contact Person Name *</label>
              <input
                name="name"
                required
                defaultValue={user.name}
                className="field"
                placeholder="e.g. Ramesh Patel"
              />
            </div>
            <div>
              <label className="label">Registered Mobile (Login ID)</label>
              <input
                disabled
                defaultValue={user.mobile}
                className="field bg-slate-100 text-slate-500 cursor-not-allowed font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">To update login mobile number, contact support.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Registered Email</label>
              <input
                disabled
                defaultValue={user.email}
                className="field bg-slate-100 text-slate-500 cursor-not-allowed font-mono text-xs"
              />
            </div>
            <div>
              <label className="label">Company / Builder Name</label>
              <input
                name="companyName"
                defaultValue={user.companyName ?? ""}
                placeholder="e.g. Shree Buildcon Pvt Ltd"
                className="field"
              />
            </div>
          </div>

          <div>
            <label className="label">GSTIN (Taxpayer Identification)</label>
            <input
              name="gstin"
              defaultValue={user.gstin ?? ""}
              placeholder="24AABCS1234F1Z5"
              maxLength={15}
              className="field uppercase font-mono text-sm tracking-wide"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-[#1e72a8]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Site & Billing Locations
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Default Site / Delivery Address *</label>
                <textarea
                  name="deliveryAddress"
                  required
                  rows={2}
                  defaultValue={user.deliveryAddress ?? ""}
                  placeholder="Full site address where trucks will unload"
                  className="field"
                />
              </div>

              <div>
                <label className="label">Billing Address (Official Records)</label>
                <textarea
                  name="billingAddress"
                  rows={2}
                  defaultValue={user.billingAddress ?? user.deliveryAddress ?? ""}
                  placeholder="Registered corporate address (defaults to site address if empty)"
                  className="field"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">City</label>
                  <input
                    name="city"
                    defaultValue={user.city ?? ""}
                    className="field"
                    placeholder="e.g. Vadodara, Surat"
                  />
                </div>
                <div>
                  <label className="label">State</label>
                  <input
                    name="state"
                    defaultValue={user.state ?? "Gujarat"}
                    className="field"
                    placeholder="Gujarat"
                  />
                </div>
                <div>
                  <label className="label">Pincode</label>
                  <input
                    name="pincode"
                    defaultValue={user.pincode ?? ""}
                    className="field font-mono"
                    placeholder="380015"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary w-full py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              Save Profile Details
            </button>
          </div>
        </form>
      </div>

      {/* 2. Change Password */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
          <KeyRound className="h-5 w-5 text-amber-600" />
          <div>
            <h2 className="text-base font-bold text-navy">Security & Password</h2>
            <p className="text-xs text-slate-400">Update your account login password.</p>
          </div>
        </div>

        {pwdError ? (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{pwdError}</span>
          </div>
        ) : null}

        {pwdSuccess ? (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{pwdSuccess}</span>
          </div>
        ) : null}

        <form action={changePasswordAction} className="space-y-4">
          <input type="hidden" name="returnPath" value="/customer/profile" />
          <div>
            <label className="label">Current Password *</label>
            <input
              type="password"
              name="currentPassword"
              required
              placeholder="••••••••"
              className="field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">New Password (Min 6 chars) *</label>
              <input
                type="password"
                name="newPassword"
                required
                minLength={6}
                placeholder="••••••••"
                className="field"
              />
            </div>
            <div>
              <label className="label">Confirm New Password *</label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                placeholder="••••••••"
                className="field"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-800 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-900 transition-colors"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* 3. Session & Logout Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-navy">Logged in as {user.name}</p>
            <p className="text-xs text-slate-500">Role: Customer • ID: {user.mobile}</p>
          </div>
        </div>

        <form action={logoutAction} className="mt-4 sm:mt-0 w-full sm:w-auto">
          <button
            type="submit"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out Securely
          </button>
        </form>
      </div>
    </div>
  );
}
