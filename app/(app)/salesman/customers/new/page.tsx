import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/session";
import { createCustomerBySalesmanAction } from "@/lib/actions/salesmen";
import {
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  ArrowLeft,
  UserPlus,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewSalesmanCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== Role.SALESMAN && session.role !== Role.ADMIN)) {
    redirect("/login");
  }

  const { error, success } = await searchParams;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <Link
          href="/salesman/customers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to My Customers</span>
        </Link>
      </div>

      <div className="card rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#13789B]/10 text-[#13789B]">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-navy">Add Customer Manually</h1>
            <p className="text-xs text-slate-500">
              Create a new customer record directly. The customer will be linked to your account.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form action={createCustomerBySalesmanAction} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  name="name"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  name="mobile"
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  placeholder="10-digit mobile"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  placeholder="customer@domain.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company / Site Name (Optional)
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  name="companyName"
                  placeholder="e.g. Shivam Builders / Site A"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Delivery Address *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <textarea
                name="address"
                required
                rows={2}
                placeholder="Plot/Survey No, Road, Area, Nearby Landmark"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
              <input
                name="city"
                required
                placeholder="e.g. Surat"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
              <input
                name="state"
                defaultValue="Gujarat"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pincode *</label>
              <input
                name="pincode"
                pattern="[0-9]{6}"
                required
                placeholder="6-digit pincode"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Instructions (Optional)</label>
            <input
              name="notes"
              placeholder="e.g. Customer prefers morning site delivery"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs outline-none focus:border-[#13789B] focus:bg-white"
            />
          </div>

          <div className="rounded-2xl bg-sky-50 border border-sky-200/80 p-3.5 text-xs text-sky-900 leading-relaxed">
            <span className="font-bold">Account Security Notice:</span> The customer record will be marked as <span className="font-semibold">Pending Activation</span> until they log in or verify their credentials. A secure activation token will be generated automatically for WhatsApp sharing.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/salesman/customers"
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-xl bg-[#13789B] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#0f607d] shadow-md transition"
            >
              Save Customer & Link to My Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
