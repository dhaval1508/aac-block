"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  ShoppingCart,
  Truck,
  Users,
  Activity,
  Layers,
  FileText,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  MoreHorizontal,
  PlayCircle,
  Send,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { cn, ROLE_LABEL } from "@/lib/utils";
import { NotificationBell } from "@/components/notification-bell";
import type { SessionUser } from "@/lib/session";

type NavGroup = {
  title: string;
  items: Array<{
    href: string;
    label: string;
    icon: any;
    badge?: number;
  }>;
};

function getNavGroupsForRole(role: SessionUser["role"], pendingCount = 0): NavGroup[] {
  switch (role) {
    case "ADMIN":
      return [
        {
          title: "OPERATIONS",
          items: [
            { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/admin/orders", label: "All Orders", icon: ShoppingCart, badge: pendingCount },
            { href: "/admin/salesmen", label: "Salesmen Management", icon: Users },
          ],
        },
        {
          title: "INVENTORY & YARD",
          items: [
            { href: "/admin/stock", label: "Stock In / Out", icon: Boxes },
            { href: "/admin/products", label: "Block Sizes & CBM", icon: Layers },
          ],
        },
        {
          title: "COMPANY & AUDIT",
          items: [
            { href: "/admin/company-profile", label: "Company Profile", icon: Building2 },
            { href: "/admin/users", label: "Users & Team", icon: Users },
            { href: "/admin/activity", label: "Activity Audit", icon: Activity },
          ],
        },
      ];
    case "SALESMAN":
      return [
        {
          title: "SALES & CLIENTS",
          items: [
            { href: "/salesman/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/salesman/customers", label: "My Customers", icon: Users },
            { href: "/salesman/customers/new", label: "Add Customer", icon: PlusCircle },
            { href: "/salesman/invitations", label: "Invite via WhatsApp", icon: Send },
          ],
        },
        {
          title: "CUSTOMER ORDERS",
          items: [
            { href: "/salesman/orders/new", label: "+ Create New Order", icon: PlusCircle },
            { href: "/salesman/orders", label: "Customer Orders", icon: ShoppingCart },
            { href: "/salesman/profile", label: "My Profile", icon: UserIcon },
          ],
        },
      ];
    case "STOCKER":
    case "STAFF":
      return [
        {
          title: "OPERATIONS",
          items: [
            { href: "/staff/dashboard", label: "Loading & Stock Dashboard", icon: LayoutDashboard },
            { href: "/stocker/orders", label: "Orders Logistics", icon: ShoppingCart },
          ],
        },
        {
          title: "INVENTORY CONTROL",
          items: [
            { href: "/stocker/stock", label: "Stock In / Out", icon: Boxes },
            { href: "/stocker/products", label: "Block Sizes & CBM", icon: Layers },
            { href: "/stocker/activity", label: "Movement Log", icon: Activity },
          ],
        },
      ];
    case "CUSTOMER":
    default:
      return [
        {
          title: "MAIN",
          items: [
            { href: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/customer/new-order", label: "New Order", icon: PlusCircle },
            { href: "/customer/orders", label: "My Orders & Tracking", icon: ShoppingCart },
          ],
        },
        {
          title: "ACCOUNT & SITES",
          items: [
            { href: "/customer/invoices", label: "Delivery Challans", icon: FileText },
            { href: "/customer/profile", label: "My Profile & Sites", icon: UserIcon },
          ],
        },
      ];
  }
}

function getPageTitle(pathname: string): { title: string; category: string } {
  if (pathname.includes("/admin/dashboard")) return { title: "Super Admin Dashboard", category: "Operations" };
  if (pathname.includes("/admin/orders")) return { title: "Order Management", category: "Operations" };
  if (pathname.includes("/admin/salesmen")) return { title: "Salesmen Management", category: "Administration" };
  if (pathname.includes("/admin/stock")) return { title: "Stock In / Out Inventory", category: "Yard Management" };
  if (pathname.includes("/admin/products")) return { title: "AAC Block Specifications", category: "Catalog & Specs" };
  if (pathname.includes("/admin/payments")) return { title: "Order Transactions", category: "Audit" };
  if (pathname.includes("/admin/users")) return { title: "Users & Access Management", category: "Administration" };
  if (pathname.includes("/admin/activity")) return { title: "System Audit Activity Log", category: "Security" };

  if (pathname.includes("/salesman/dashboard")) return { title: "Salesman Dashboard", category: "Sales Portal" };
  if (pathname.includes("/salesman/customers/new")) return { title: "Add Customer", category: "Sales Portal" };
  if (pathname.includes("/salesman/customers")) return { title: "My Assigned Customers", category: "Sales Portal" };
  if (pathname.includes("/salesman/invitations")) return { title: "WhatsApp Invitations", category: "Sales Portal" };
  if (pathname.includes("/salesman/orders/new")) return { title: "Create Customer Order", category: "Sales Portal" };
  if (pathname.includes("/salesman/orders/") && pathname.includes("/edit")) return { title: "Edit Customer Order", category: "Sales Portal" };
  if (pathname.includes("/salesman/orders")) return { title: "Customer Order Tracking", category: "Sales Portal" };
  if (pathname.includes("/salesman/profile")) return { title: "Salesman Profile", category: "Account" };

  if (pathname.includes("/stocker/dashboard")) return { title: "Stocker Overview", category: "Inventory" };
  if (pathname.includes("/stocker/orders")) return { title: "Order Logistics Tracking", category: "Logistics" };
  if (pathname.includes("/stocker/stock")) return { title: "Stock Movement Entry", category: "Inventory" };
  if (pathname.includes("/stocker/products")) return { title: "Block Dimensions & Volume", category: "Specifications" };
  if (pathname.includes("/stocker/activity")) return { title: "Material Movement Audit", category: "Audit" };

  if (pathname.includes("/staff/dashboard")) return { title: "Yard Loading Tasks", category: "Dispatch" };
  if (pathname.includes("/staff/orders")) return { title: "Physical Count Verification", category: "Loading" };

  if (pathname.includes("/customer/dashboard")) return { title: "Customer Dashboard", category: "Portal" };
  if (pathname.includes("/customer/new-order")) return { title: "Place New AAC Order", category: "Ordering" };
  if (pathname.includes("/customer/orders")) return { title: "Order Status & Tracking", category: "My Account" };
  if (pathname.includes("/customer/invoices")) return { title: "Delivery Challans & Dispatch Slips", category: "Dispatch" };
  if (pathname.includes("/customer/profile")) return { title: "Company Profile", category: "Account" };

  return { title: "Factory Management Portal", category: "Swarnim AAC Block" };
}

export function AppShell({
  user,
  pendingCount = 0,
  children,
}: {
  user: SessionUser;
  pendingCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "active";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navGroups = getNavGroupsForRole(user.role, pendingCount);
  const { title: pageTitle, category: pageCategory } = getPageTitle(pathname);

  // Close mobile drawer and more sheet on route navigation
  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  // Read saved sidebar collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("swarnim_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("swarnim_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const allItems = navGroups.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-[#172033] antialiased" suppressHydrationWarning>
      {/* =========================================================================
          DESKTOP SIDEBAR
      ========================================================================= */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-[#111827] text-white transition-all duration-300 ease-in-out lg:flex print:hidden",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <Link
            href={
              user.role === "CUSTOMER"
                ? "/customer/dashboard"
                : `/${user.role.toLowerCase()}/dashboard`
            }
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Swarnim AAC Block Pvt. Ltd."
                className="h-8 w-auto object-contain"
              />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 animate-in fade-in duration-200">
                <span className="block text-xs font-black tracking-wide text-white uppercase truncate">
                  Swarnim AAC
                </span>
                <span className="block text-[10px] text-slate-400 font-medium truncate">
                  Factory ERP
                </span>
              </div>
            )}
          </Link>

          {/* Collapse / Expand Toggle Button */}
          <button
            onClick={toggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Grouped Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!collapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" &&
                    item.href !== `/${user.role.toLowerCase()}/dashboard` &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all relative",
                      active
                        ? "bg-[#13789B] text-white shadow-sm font-bold"
                        : "text-slate-300 hover:bg-white/10 hover:text-white",
                      collapsed && "justify-center px-2 py-3"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                        active ? "text-white" : "text-slate-400 group-hover:text-white"
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}
                    {!collapsed && item.badge && item.badge > 0 ? (
                      <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-navy shadow-xs">
                        {item.badge}
                      </span>
                    ) : null}
                    {collapsed && item.badge && item.badge > 0 ? (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#111827]" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Account & Logout Footer */}
        <div className="border-t border-white/10 p-3 bg-white/[0.02]">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl p-2",
              collapsed && "flex-col p-1 text-center"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 font-bold text-xs text-white border border-white/10">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{user.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="truncate text-[10px] font-semibold text-slate-400 uppercase">
                    {ROLE_LABEL[user.role]}
                  </span>
                </div>
              </div>
            )}
          </div>

          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              title="Sign out of account"
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer",
                collapsed && "justify-center px-1"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0 text-slate-400 hover:text-rose-300" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE MORE / ACCOUNT BOTTOM SHEET MODAL
      ========================================================================= */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200 flex flex-col justify-end print:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))" }}
          >
            {/* Grab handle */}
            <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 p-1 shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Swarnim AAC" className="h-6 w-6 object-contain" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-navy uppercase tracking-wider">
                    {user.role === "ADMIN" ? "Super Admin Portal" : "Menu & Account"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Swarnim AAC Block ERP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:text-navy hover:bg-slate-200 transition-colors"
                aria-label="Close Menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Role-Specific Secondary Navigation Links in More Sheet */}
            {user.role === "ADMIN" && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Management & Audit
                </span>
                <Link
                  href="/admin/users"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/admin/users")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">Users & Team Management</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/admin/users") ? "text-white/80" : "text-slate-400")}>
                      Staff permissions & registered client directory
                    </span>
                  </div>
                </Link>

                <Link
                  href="/admin/activity"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/admin/activity")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <Activity className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">Activity & Security Audit</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/admin/activity") ? "text-white/80" : "text-slate-400")}>
                      Live yard movements, dispatches & audit trail
                    </span>
                  </div>
                </Link>
              </div>
            )}



            {user.role === "SALESMAN" && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Sales Portal & Actions
                </span>
                <Link
                  href="/salesman/customers/new"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/salesman/customers/new")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">Add New Customer</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/salesman/customers/new") ? "text-white/80" : "text-slate-400")}>
                      Register builder or contractor with default site
                    </span>
                  </div>
                </Link>

                <Link
                  href="/salesman/invitations"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/salesman/invitations")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <Send className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">WhatsApp Customer Invitations</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/salesman/invitations") ? "text-white/80" : "text-slate-400")}>
                      Send auto-linking registration invite links
                    </span>
                  </div>
                </Link>

                <Link
                  href="/salesman/orders"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/salesman/orders")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <ShoppingCart className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">Customer Orders & Tracking</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/salesman/orders") ? "text-white/80" : "text-slate-400")}>
                      View placed orders, volumes & status
                    </span>
                  </div>
                </Link>

                <Link
                  href="/salesman/profile"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/salesman/profile")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">Salesman Profile & Password</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/salesman/profile") ? "text-white/80" : "text-slate-400")}>
                      Credentials, stats, and security settings
                    </span>
                  </div>
                </Link>
              </div>
            )}

            {user.role === "CUSTOMER" && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Customer Profile & Services
                </span>
                <Link
                  href="/customer/profile"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/customer/profile")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">My Profile & Delivery Sites</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/customer/profile") ? "text-white/80" : "text-slate-400")}>
                      Company details, GSTIN, and destination sites
                    </span>
                  </div>
                </Link>

                <Link
                  href="/customer/new-order"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/customer/new-order")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">Place New AAC Order</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/customer/new-order") ? "text-white/80" : "text-slate-400")}>
                      Book consignments with direct factory loading
                    </span>
                  </div>
                </Link>

                <Link
                  href="/customer/invoices"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/customer/invoices")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">Delivery Challans & Slips</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/customer/invoices") ? "text-white/80" : "text-slate-400")}>
                      Official dispatch documentation & passes
                    </span>
                  </div>
                </Link>
              </div>
            )}

            {(user.role === "STAFF" || user.role === "STOCKER") && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Loading & Yard Operations
                </span>
                <Link
                  href="/staff/dashboard"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname === "/staff/dashboard" && (!currentTab || currentTab === "active")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <PlayCircle className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">Active Yard Loading Tasks</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname === "/staff/dashboard" && (!currentTab || currentTab === "active") ? "text-white/80" : "text-slate-400")}>
                      Currently assigned vehicles ready for loading
                    </span>
                  </div>
                </Link>

                <Link
                  href="/staff/dashboard?tab=all"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    currentTab === "all"
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <Truck className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">All Orders & Lifetime History</span>
                    <span className={cn("text-[10px] font-medium block truncate", currentTab === "all" ? "text-white/80" : "text-slate-400")}>
                      Review completed and past truck assignments
                    </span>
                  </div>
                </Link>

                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1 pt-2">
                  Inventory & Yard Audit
                </span>
                <Link
                  href="/stocker/stock"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/stocker/stock")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <Boxes className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">Stock In / Out Entry</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/stocker/stock") ? "text-white/80" : "text-slate-400")}>
                      Record factory intake and manual adjustments
                    </span>
                  </div>
                </Link>

                <Link
                  href="/stocker/products"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/stocker/products")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <Layers className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">AAC Block Dimensions</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/stocker/products") ? "text-white/80" : "text-slate-400")}>
                      Physical dimensions, cubic volume & density
                    </span>
                  </div>
                </Link>

                <Link
                  href="/stocker/activity"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl p-3 text-xs font-bold transition-all",
                    pathname.startsWith("/stocker/activity")
                      ? "bg-[#13789B] text-white shadow-xs"
                      : "bg-slate-50 text-navy hover:bg-slate-100"
                  )}
                >
                  <Activity className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">Movement Log & Audit Trail</span>
                    <span className={cn("text-[10px] font-medium block truncate", pathname.startsWith("/stocker/activity") ? "text-white/80" : "text-slate-400")}>
                      Complete log of production intake and dispatches
                    </span>
                  </div>
                </Link>
              </div>
            )}

            {/* User Account Details */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#13789B] text-sm font-black text-white shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-navy truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  <span className="inline-block mt-0.5 rounded-md bg-[#13789B]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#13789B]">
                    {ROLE_LABEL[user.role]}
                  </span>
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out of Portal</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN APPLICATION SHELL WRAPPER
      ========================================================================= */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out flex flex-col print:p-0 print:m-0 print:pl-0",
          collapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Desktop Enterprise Top Header */}
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur-md lg:flex shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span>{pageCategory}</span>
                <span>/</span>
                <span className="text-[#13789B] font-bold">{pageTitle}</span>
              </div>
              <h1 className="text-base font-black text-slate-900 tracking-tight">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell role={user.role} />
            {/* Quick Profile Pill */}
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 shadow-2xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#13789B] text-xs font-black text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {ROLE_LABEL[user.role]}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 sm:px-4 backdrop-blur-md lg:hidden shadow-xs min-w-0 max-w-full print:hidden">
          <Link
            href={
              user.role === "CUSTOMER"
                ? "/customer/dashboard"
                : `/${user.role.toLowerCase()}/dashboard`
            }
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 p-1 shadow-2xs shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Swarnim AAC" className="h-6 w-6 object-contain" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-black tracking-wide text-navy uppercase truncate leading-tight">
                Swarnim AAC
              </span>
              <span className="block text-[9px] text-slate-400 font-bold truncate leading-tight">
                Factory ERP
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell role={user.role} />
            <span className="rounded-full bg-slate-100 px-2 sm:px-2.5 py-1 text-[10px] font-bold text-[#13789B] truncate max-w-[130px]">
              {ROLE_LABEL[user.role]}
            </span>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#13789B] text-xs font-black text-white shadow-2xs hover:bg-[#0F627F] transition-all cursor-pointer"
              aria-label="Account Menu"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-full min-w-0 pb-24 sm:pb-28 lg:pb-8 overflow-x-clip print:p-0 print:m-0 print:overflow-visible">
          <div className="mx-auto w-full max-w-7xl min-w-0 print:max-w-full print:p-0 print:m-0">{children}</div>
        </main>

        {/* Mobile Sticky Bottom Navigation Bar */}
        <nav
          style={{ position: "fixed", bottom: 0, left: 0, width: "100%", zIndex: 1000 }}
          className="border-t border-slate-200/90 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1 px-1.5 backdrop-blur-md lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] print:hidden"
        >
          {user.role === "ADMIN" && (
            <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
              <Link
                href="/admin/dashboard"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname === "/admin/dashboard"
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <LayoutDashboard
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname === "/admin/dashboard" ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Dashboard</span>
              </Link>

              <Link
                href="/admin/orders"
                className={cn(
                  "relative flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/admin/orders")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <ShoppingCart
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/admin/orders") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-2 sm:right-3 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white ring-2 ring-white">
                    {pendingCount}
                  </span>
                )}
                <span className="mt-0.5 truncate max-w-[62px]">Orders</span>
              </Link>

              <Link
                href="/admin/stock"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/admin/stock")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <Boxes
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/admin/stock") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Stock</span>
              </Link>

              <Link
                href="/admin/products"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/admin/products")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <Layers
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/admin/products") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Sizes</span>
              </Link>

              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                className={cn(
                  "relative flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors cursor-pointer",
                  moreOpen || pathname.startsWith("/admin/users") || pathname.startsWith("/admin/activity")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <MoreHorizontal
                  className={cn(
                    "h-5 w-5 transition-transform",
                    moreOpen || pathname.startsWith("/admin/users") || pathname.startsWith("/admin/activity")
                      ? "text-[#13789B] scale-110"
                      : "text-slate-400"
                  )}
                />
                {(pathname.startsWith("/admin/users") || pathname.startsWith("/admin/activity")) && (
                  <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-[#13789B] ring-2 ring-white" />
                )}
                <span className="mt-0.5 truncate max-w-[62px]">More</span>
              </button>
            </div>
          )}

          {user.role === "SALESMAN" && (
            <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
              <Link
                href="/salesman/dashboard"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname === "/salesman/dashboard"
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <LayoutDashboard
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname === "/salesman/dashboard" ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Dashboard</span>
              </Link>

              <Link
                href="/salesman/customers"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/salesman/customers")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <Users
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/salesman/customers") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Customers</span>
              </Link>

              <Link
                href="/salesman/invitations"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/salesman/invitations")
                    ? "text-emerald-700 font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <Send
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/salesman/invitations") ? "text-emerald-600 scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">WhatsApp</span>
              </Link>

              <Link
                href="/salesman/orders"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/salesman/orders")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <ShoppingCart
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/salesman/orders") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Orders</span>
              </Link>

              <Link
                href="/salesman/profile"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/salesman/profile")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <UserIcon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/salesman/profile") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Profile</span>
              </Link>
            </div>
          )}

          {user.role === "CUSTOMER" && (
            <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
              <Link
                href="/customer/dashboard"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname === "/customer/dashboard"
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <LayoutDashboard
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname === "/customer/dashboard" ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Dashboard</span>
              </Link>

              <Link
                href="/customer/new-order"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/customer/new-order")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <PlusCircle
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/customer/new-order") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">New Order</span>
              </Link>

              <Link
                href="/customer/orders"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/customer/orders")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <ShoppingCart
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/customer/orders") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Orders</span>
              </Link>

              <Link
                href="/customer/invoices"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/customer/invoices")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <FileText
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/customer/invoices") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Challans</span>
              </Link>

              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                className={cn(
                  "relative flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors cursor-pointer",
                  moreOpen || pathname.startsWith("/customer/profile")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <MoreHorizontal
                  className={cn(
                    "h-5 w-5 transition-transform",
                    moreOpen || pathname.startsWith("/customer/profile") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                {pathname.startsWith("/customer/profile") && (
                  <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-[#13789B] ring-2 ring-white" />
                )}
                <span className="mt-0.5 truncate max-w-[62px]">More</span>
              </button>
            </div>
          )}

          {(user.role === "STAFF" || user.role === "STOCKER") && (
            <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
              <Link
                href="/staff/dashboard"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/staff")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <Truck
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/staff") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Tasks</span>
              </Link>

              <Link
                href="/stocker/orders"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/stocker/orders")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <ShoppingCart
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/stocker/orders") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Orders</span>
              </Link>

              <Link
                href="/stocker/stock"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/stocker/stock")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <Boxes
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/stocker/stock") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Stock</span>
              </Link>

              <Link
                href="/stocker/products"
                className={cn(
                  "flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors",
                  pathname.startsWith("/stocker/products")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <Layers
                  className={cn(
                    "h-5 w-5 transition-transform",
                    pathname.startsWith("/stocker/products") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                <span className="mt-0.5 truncate max-w-[62px]">Sizes</span>
              </Link>

              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                className={cn(
                  "relative flex min-h-[46px] flex-col items-center justify-center rounded-xl py-1 text-[10px] font-medium transition-colors cursor-pointer",
                  moreOpen || pathname.startsWith("/stocker/activity")
                    ? "text-[#13789B] font-black"
                    : "text-slate-500 hover:text-navy"
                )}
              >
                <MoreHorizontal
                  className={cn(
                    "h-5 w-5 transition-transform",
                    moreOpen || pathname.startsWith("/stocker/activity") ? "text-[#13789B] scale-110" : "text-slate-400"
                  )}
                />
                {pathname.startsWith("/stocker/activity") && (
                  <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-[#13789B] ring-2 ring-white" />
                )}
                <span className="mt-0.5 truncate max-w-[62px]">More</span>
              </button>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
