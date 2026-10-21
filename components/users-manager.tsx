"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  UserCheck,
  Shield,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Layers,
  ShoppingBag,
  UserX,
  Calendar,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { ROLE_LABEL, formatDate } from "@/lib/utils";
import { toggleUserAction, deleteUserAction } from "@/lib/actions/users";
import { AddStaffModal } from "@/components/add-staff-modal";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";

export type InternalUser = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  role: "ADMIN" | "STOCKER" | "STAFF" | "CUSTOMER";
  active: boolean;
  createdAt: Date | string;
};

export type CustomerUser = {
  id: string;
  name: string;
  companyName: string | null;
  gstin: string | null;
  mobile: string;
  email: string;
  city: string | null;
  state: string | null;
  active: boolean;
  createdAt: Date | string;
  _count: {
    customerOrders: number;
  };
};

export function UsersManager({
  internalUsers,
  customers,
  currentUserId,
}: {
  internalUsers: InternalUser[];
  customers: CustomerUser[];
  currentUserId: string;
}) {
  const [staffList, setStaffList] = useState<InternalUser[]>(internalUsers);
  const [customerList, setCustomerList] = useState<CustomerUser[]>(customers);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    type: "STAFF" | "CUSTOMER";
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"STAFF" | "CUSTOMERS">("STAFF");
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState<"ALL" | "STAFF" | "ADMIN">("ALL");
  const [staffStatusFilter, setStaffStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerStatusFilter, setCustomerStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");

  useEffect(() => {
    setStaffList(internalUsers);
  }, [internalUsers]);

  useEffect(() => {
    setCustomerList(customers);
  }, [customers]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteUserAction(deleteTarget.id);
      if (res?.success) {
        if (deleteTarget.type === "STAFF") {
          setStaffList((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        } else {
          setCustomerList((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        }
        setNotification({
          type: "success",
          message: `${deleteTarget.type === "STAFF" ? "Staff member" : "Customer account"} "${deleteTarget.name}" deleted successfully.`,
        });
        setDeleteTarget(null);
      } else {
        setNotification({
          type: "error",
          message: res?.error || "Failed to delete user.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "An unexpected error occurred during user deletion.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Summary Metrics (All 6 KPIs from Section 8)
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((u) => u.active).length;
  const disabledStaff = totalStaff - activeStaff;
  const totalCustomers = customerList.length;
  const activeCustomers = customerList.filter((c) => c.active).length;
  const totalOrders = customerList.reduce((sum, c) => sum + c._count.customerOrders, 0);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((u) => {
      const matchesRole =
        staffRoleFilter === "ALL"
          ? true
          : staffRoleFilter === "STAFF"
          ? u.role === "STAFF" || u.role === "STOCKER"
          : u.role === "ADMIN";
      const matchesStatus =
        staffStatusFilter === "ALL"
          ? true
          : staffStatusFilter === "ACTIVE"
          ? u.active
          : !u.active;
      const q = staffSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.mobile.toLowerCase().includes(q);

      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [staffList, staffRoleFilter, staffStatusFilter, staffSearch]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customerList.filter((c) => {
      const matchesStatus =
        customerStatusFilter === "ALL"
          ? true
          : customerStatusFilter === "ACTIVE"
          ? c.active
          : !c.active;
      const q = customerSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        c.email.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [customerList, customerStatusFilter, customerSearch]);

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 max-w-full">
      {/* Success / Error Notification */}
      {notification && (
        <div
          className={`rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-xs transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* =========================================================================
          TOP METRIC KPI CARDS (6 Comprehensive Metrics)
      ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6 min-w-0">
        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-purple-500 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">Total Staff</span>
            <Shield className="h-4 w-4 text-purple-600 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{totalStaff}</p>
          <span className="text-[10px] text-slate-400 truncate block">Team members</span>
        </div>

        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-emerald-500 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">Active Staff</span>
            <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-700 truncate">{activeStaff}</p>
          <span className="text-[10px] text-slate-400 truncate block">Logins enabled</span>
        </div>

        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-slate-400 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">Disabled</span>
            <UserX className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-slate-600 truncate">{disabledStaff}</p>
          <span className="text-[10px] text-slate-400 truncate block">Access revoked</span>
        </div>

        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-[#13789B] min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">Builders</span>
            <Building2 className="h-4 w-4 text-[#13789B] shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{totalCustomers}</p>
          <span className="text-[10px] text-slate-400 truncate block">Registered clients</span>
        </div>

        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-teal-500 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">Active Clients</span>
            <UserCheck className="h-4 w-4 text-teal-600 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-teal-700 truncate">{activeCustomers}</p>
          <span className="text-[10px] text-slate-400 truncate block">Ordering active</span>
        </div>

        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-amber-500 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">Client Orders</span>
            <ShoppingBag className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{totalOrders}</p>
          <span className="text-[10px] text-slate-400 truncate block">Bookings</span>
        </div>
      </div>

      {/* =========================================================================
          SECTION TOGGLE TABS (STAFF VS CUSTOMERS)
      ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-b border-slate-200 pb-2 min-w-0">
        <button
          type="button"
          onClick={() => setActiveTab("STAFF")}
          className={`flex items-center justify-center gap-2 rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "STAFF"
              ? "bg-[#111827] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Factory Operations Team ({internalUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CUSTOMERS")}
          className={`flex items-center justify-center gap-2 rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "CUSTOMERS"
              ? "bg-[#111827] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Registered Customers & Builders ({customers.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: FACTORY STAFF DIRECTORY
      ========================================================================= */}
      {activeTab === "STAFF" && (
        <div className="card rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-navy flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                Factory Personnel Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage roles and credentials for Loading & Stock Staff and Super Administrators.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStaffModalOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-[#13789B] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0F627F] transition-all self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Add Team Member</span>
            </button>
          </div>

          {/* Search, Role Filters, and Status Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search staff by name, email, or mobile..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-navy placeholder:text-slate-400 focus:bg-white focus:border-[#13789B] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Role Filter Pills */}
              <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs">
                {(["ALL", "STAFF", "ADMIN"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setStaffRoleFilter(r)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      staffRoleFilter === r
                        ? "bg-white text-navy shadow-xs"
                        : "text-slate-500 hover:text-navy"
                    }`}
                  >
                    {r === "ALL"
                      ? "All Roles"
                      : r === "STAFF"
                      ? "Loading & Stock Staff"
                      : "Super Admin"}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs">
                {(["ALL", "ACTIVE", "DISABLED"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStaffStatusFilter(s)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      staffStatusFilter === s
                        ? "bg-white text-navy shadow-xs"
                        : "text-slate-500 hover:text-navy"
                    }`}
                  >
                    {s === "ALL" ? "All Status" : s === "ACTIVE" ? "Active" : "Disabled"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Staff Cards View */}
          <div className="lg:hidden divide-y divide-slate-100 -mx-1">
            {filteredStaff.map((u) => (
              <div key={u.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#13789B]/10 text-[#13789B] font-bold text-xs shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-navy text-xs truncate">{u.name}</p>
                      <span className="inline-block mt-0.5 rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 font-bold text-slate-700 text-[10px]">
                        {ROLE_LABEL[u.role]}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                      u.active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {u.active ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" /> Disabled
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-semibold block truncate">Email</span>
                    <span className="text-slate-600 text-[11px] truncate block">{u.email}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-semibold block truncate">Mobile</span>
                    <span className="text-slate-600 text-[11px] font-mono truncate block">{u.mobile}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[10px] text-slate-400">Joined: {formatDate(u.createdAt)}</span>
                  {u.id !== currentUserId ? (
                    <div className="flex items-center gap-1.5">
                      <form
                        action={toggleUserAction}
                        onSubmit={(e) => {
                          const action = u.active ? "disable" : "enable";
                          if (!window.confirm(`Are you sure you want to ${action} login access for ${u.name}?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                            u.active
                              ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          {u.active ? "Disable Login" : "Enable Login"}
                        </button>
                      </form>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: u.id, name: u.name, type: "STAFF" })}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                        title="Delete staff account"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold italic">Current Admin</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Staff Table */}
          <div className="hidden lg:block overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#13789B]/10 text-[#13789B] font-bold text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-navy">{u.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 font-bold text-slate-700 text-[10px]">
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">{u.email}</td>

                    <td className="py-3 px-4 text-slate-600 font-mono">{u.mobile}</td>

                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          u.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {u.active ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> Disabled
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {u.id !== currentUserId ? (
                        <div className="inline-flex items-center gap-1.5">
                          <form
                            action={toggleUserAction}
                            onSubmit={(e) => {
                              const action = u.active ? "disable" : "enable";
                              if (!window.confirm(`Are you sure you want to ${action} login access for ${u.name}?`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              type="submit"
                              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                                u.active
                                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              }`}
                            >
                              {u.active ? "Disable Login" : "Enable Login"}
                            </button>
                          </form>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: u.id, name: u.name, type: "STAFF" })}
                            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                            title="Delete staff account"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold italic">Current Admin</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No staff members match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: REGISTERED CUSTOMERS DIRECTORY
      ========================================================================= */}
      {activeTab === "CUSTOMERS" && (
        <div className="card rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-navy flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#13789B]" />
                Registered Clients & Builders Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Construction contractors, real estate builders, and commercial developers.
              </p>
            </div>
          </div>

          {/* Search & Status Filters Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search builder, company name, GSTIN, city, phone..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-navy placeholder:text-slate-400 focus:bg-white focus:border-[#13789B] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs">
              {(["ALL", "ACTIVE", "DISABLED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCustomerStatusFilter(s)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    customerStatusFilter === s
                      ? "bg-white text-navy shadow-xs"
                      : "text-slate-500 hover:text-navy"
                  }`}
                >
                  {s === "ALL" ? "All Builders" : s === "ACTIVE" ? "Active" : "Disabled"}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Customers Cards View */}
          <div className="lg:hidden divide-y divide-slate-100 -mx-1">
            {filteredCustomers.map((c) => (
              <div key={c.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-navy text-xs truncate">{c.name}</p>
                    <p className="font-semibold text-[#13789B] text-[11px] truncate">
                      {c.companyName || <span className="text-slate-400 italic">No Company</span>}
                    </p>
                  </div>

                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                      c.active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {c.active ? "Active" : "Disabled"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-semibold block truncate">Phone & City</span>
                    <span className="text-slate-700 text-[11px] font-mono block truncate">{c.mobile}</span>
                    <span className="text-slate-500 text-[10px] block truncate">{c.city || "Gujarat"}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-semibold block truncate">GSTIN & Orders</span>
                    <span className="text-slate-600 text-[11px] font-mono block truncate">{c.gstin || "—"}</span>
                    <Link
                      href={`/admin/orders?q=${encodeURIComponent(c.name)}`}
                      className="text-[#13789B] font-bold text-[10px] hover:underline block"
                    >
                      {c._count.customerOrders} orders →
                    </Link>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{c.email}</span>
                  <div className="flex items-center gap-1.5">
                    <form
                      action={toggleUserAction}
                      onSubmit={(e) => {
                        const action = c.active ? "disable" : "enable";
                        if (!window.confirm(`Are you sure you want to ${action} account for ${c.name} (${c.companyName || "Builder"})?`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                          c.active
                            ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        {c.active ? "Disable Account" : "Enable Account"}
                      </button>
                    </form>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: c.id, name: c.name, type: "CUSTOMER" })}
                      className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                      title="Delete customer account"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Customers Table */}
          <div className="hidden lg:block overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Customer Contact</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">GSTIN Number</th>
                  <th className="py-3 px-4">Phone & Email</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Account Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-navy">{c.name}</td>
                    <td className="py-3 px-4 font-bold text-[#13789B]">
                      {c.companyName || <span className="text-slate-400 italic font-normal">—</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {c.gstin || <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{c.mobile}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{c.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.city ? `${c.city}, ${c.state || "Gujarat"}` : "Gujarat"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-black text-navy">
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(c.name)}`}
                        className="hover:underline hover:text-[#13789B]"
                      >
                        {c._count.customerOrders} orders
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {c.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <form
                          action={toggleUserAction}
                          onSubmit={(e) => {
                            const action = c.active ? "disable" : "enable";
                            if (!window.confirm(`Are you sure you want to ${action} account for ${c.name} (${c.companyName || "Builder"})?`)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                              c.active
                                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            {c.active ? "Disable" : "Enable"}
                          </button>
                        </form>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: c.id, name: c.name, type: "CUSTOMER" })}
                          className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                          title="Delete customer account"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No customer accounts found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {staffModalOpen && (
        <AddStaffModal onClose={() => setStaffModalOpen(false)} />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.type === "STAFF" ? "Delete Staff Member" : "Delete Customer Account"}
        itemName={deleteTarget?.name}
        message="Are you sure you want to delete this? This action cannot be undone."
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
