import Link from "next/link";
import { redirect } from "next/navigation";
import { Role, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  Users,
  UserPlus,
  Send,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  Layers,
  ArrowRight,
  Phone,
  FileText,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { formatDate, formatNumber, formatBlockSizeName, ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalesmanDashboardPage() {
  const session = await getSession();
  if (!session || (session.role !== Role.SALESMAN && session.role !== Role.ADMIN)) {
    redirect("/login");
  }

  const salesmanId = session.id;

  // Real data queries from Neon PostgreSQL
  const [
    myCustomers,
    pendingInvitationsCount,
    salesmanOrders,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { salesmanId, role: Role.CUSTOMER },
      include: {
        customerOrders: {
          select: {
            id: true,
            totalCbm: true,
            quantity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customerInvitation.count({
      where: { salesmanId, status: "PENDING", expiresAt: { gt: new Date() } },
    }),
    prisma.order.findMany({
      where: { salesmanId },
      include: {
        customer: { select: { name: true, companyName: true, mobile: true } },
        product: { select: { sizeLabel: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalCustomers = myCustomers.length;
  const activeCustomers = myCustomers.filter((c) => c.active).length;
  const totalOrders = salesmanOrders.length;

  const newOrdersCount = salesmanOrders.filter((o) => o.status === OrderStatus.PENDING).length;
  const confirmedOrdersCount = salesmanOrders.filter((o) => o.status === OrderStatus.CONFIRMED).length;
  const loadingOrdersCount = salesmanOrders.filter(
    (o) => o.status === OrderStatus.LOADING || o.status === OrderStatus.LOADED || o.status === OrderStatus.ASSIGNED
  ).length;
  const dispatchedOrdersCount = salesmanOrders.filter((o) => o.status === OrderStatus.DISPATCHED).length;
  const deliveredOrdersCount = salesmanOrders.filter((o) => o.status === OrderStatus.DELIVERED).length;

  const totalCbm = salesmanOrders.reduce(
    (acc, o) => acc + (o.totalCbm ? Number(o.totalCbm) : 0),
    0
  );

  const recentOrders = salesmanOrders.slice(0, 5);
  const recentCustomers = myCustomers.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Actions */}
      <div className="card rounded-3xl bg-gradient-to-br from-slate-900 via-navy to-[#13789B] p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-white/20 backdrop-blur-xs px-2.5 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                Salesman Private Dashboard
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {session.name}
            </h1>
            <p className="mt-1 text-xs text-slate-200">
              Swarnim AAC Block Management System • Track assigned customers, WhatsApp invites & orders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/salesman/invitations"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition"
            >
              <Send className="h-4 w-4" />
              <span>Invite via WhatsApp</span>
            </Link>
            <Link
              href="/salesman/customers/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-white hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-navy shadow-md transition"
            >
              <UserPlus className="h-4 w-4 text-[#13789B]" />
              <span>Add Customer</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Link
          href="/salesman/customers"
          className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs hover:border-[#13789B] transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">My Customers</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{totalCustomers}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-semibold">{activeCustomers} active</p>
        </Link>

        <Link
          href="/salesman/invitations"
          className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs hover:border-[#13789B] transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Pending Invites</span>
            <Send className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{pendingInvitationsCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 font-semibold">Active links sent</p>
        </Link>

        <Link
          href="/salesman/orders"
          className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs hover:border-[#13789B] transition"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Total Orders</span>
            <ShoppingBag className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{totalOrders}</p>
          <p className="mt-0.5 text-[11px] text-slate-400 font-semibold">From my customers</p>
        </Link>

        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase text-slate-500">Total Ordered CBM</span>
            <Layers className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{totalCbm.toFixed(2)} CBM</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-semibold">Factory volume</p>
        </div>
      </div>

      {/* Pipeline Status Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3">
          <span className="text-[10px] font-bold uppercase text-amber-800">New / Pending</span>
          <p className="text-xl font-black text-amber-900 mt-1">{newOrdersCount}</p>
        </div>
        <div className="rounded-2xl bg-blue-50/70 border border-blue-200/80 p-3">
          <span className="text-[10px] font-bold uppercase text-blue-800">Confirmed</span>
          <p className="text-xl font-black text-blue-900 mt-1">{confirmedOrdersCount}</p>
        </div>
        <div className="rounded-2xl bg-purple-50/70 border border-purple-200/80 p-3">
          <span className="text-[10px] font-bold uppercase text-purple-800">In Loading</span>
          <p className="text-xl font-black text-purple-900 mt-1">{loadingOrdersCount}</p>
        </div>
        <div className="rounded-2xl bg-sky-50/70 border border-sky-200/80 p-3">
          <span className="text-[10px] font-bold uppercase text-sky-800">Dispatched</span>
          <p className="text-xl font-black text-sky-900 mt-1">{dispatchedOrdersCount}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-3 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase text-emerald-800">Delivered</span>
          <p className="text-xl font-black text-emerald-900 mt-1">{deliveredOrdersCount}</p>
        </div>
      </div>

      {/* Two Column Layout: My Customers & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: My Customers Card */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-navy">My Customers</h2>
              <p className="text-[11px] text-slate-400">Exclusively linked to your account</p>
            </div>
            <Link
              href="/salesman/customers"
              className="text-xs font-bold text-[#13789B] hover:underline inline-flex items-center gap-1"
            >
              <span>View All ({totalCustomers})</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No Customers Linked Yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Send a WhatsApp invitation to link your first customer.</p>
              <Link
                href="/salesman/invitations"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Invite Customer via WhatsApp</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
              {recentCustomers.map((c) => {
                const totalCbm = c.customerOrders.reduce(
                  (acc, ord) => acc + (ord.totalCbm ? Number(ord.totalCbm) : 0),
                  0
                );

                return (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-navy truncate">{c.name}</p>
                      {c.companyName && (
                        <p className="text-[11px] text-slate-500 truncate">{c.companyName}</p>
                      )}
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.mobile}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-navy">{totalCbm.toFixed(2)} CBM</p>
                      <p className="text-[11px] text-slate-400 font-semibold">{c.customerOrders.length} orders</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Recent Customer Orders */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-navy">Recent Customer Orders</h2>
              <p className="text-[11px] text-slate-400">Real-time status updates</p>
            </div>
            <Link
              href="/salesman/orders"
              className="text-xs font-bold text-[#13789B] hover:underline inline-flex items-center gap-1"
            >
              <span>View All ({totalOrders})</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No Orders Yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Orders placed by your customers will appear here automatically.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
              {recentOrders.map((o) => (
                <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/salesman/orders/${o.id}`}
                      className="text-xs font-bold text-[#13789B] hover:underline font-mono block truncate"
                    >
                      {o.orderNo}
                    </Link>
                    <p className="text-[11px] font-medium text-slate-700 truncate">
                      {o.customer.companyName || o.customer.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(o.createdAt)}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        ORDER_STATUS_CLASS[o.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ORDER_STATUS_LABEL[o.status] || o.status}
                    </span>
                    <p className="text-xs font-black text-navy mt-1">
                      {o.totalCbm ? `${Number(o.totalCbm).toFixed(3)} CBM` : `${formatNumber(o.quantity)} units`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
