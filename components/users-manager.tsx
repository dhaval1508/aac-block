"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  UserPlus,
  Search,
  UserCheck,
  Shield,
  CheckCircle2,
  XCircle,
  Building2,
  ShoppingBag,
  UserX,
  Trash2,
  AlertCircle,
  Boxes,
  Users,
  Send,
  Phone,
  Mail,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toggleUserAction, deleteUserAction } from "@/lib/actions/users";
import { AddStaffModal } from "@/components/add-staff-modal";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";

export type ManagedUser = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  role: "ADMIN" | "SALESMAN" | "CUSTOMER" | "STAFF" | "STOCKER";
  active: boolean;
  salesmanCode?: string | null;
  companyName?: string | null;
  gstin?: string | null;
  city?: string | null;
  state?: string | null;
  deliveryAddress?: string | null;
  remarks?: string | null;
  createdAt: Date | string;
  salesmanId?: string | null;
  salesman?: {
    id: string;
    name: string;
    salesmanCode?: string | null;
  } | null;
  _count: {
    customerOrders: number;
    salesmanOrders: number;
    assignedCustomers: number;
    assignedOrders: number;
  };
};

export type CustomerInvitationItem = {
  id: string;
  salesmanId: string;
  customerName: string;
  mobile: string;
  token: string;
  status: string; // PENDING, ACCEPTED, EXPIRED, REVOKED
  expiresAt: Date | string;
  acceptedAt?: Date | string | null;
  createdAt: Date | string;
  salesman: {
    id: string;
    name: string;
    salesmanCode?: string | null;
  };
};

export type RoleFilterOption = "ALL" | "ADMIN" | "SALESMAN" | "CUSTOMER" | "STAFF";
export type StatusFilterOption = "ALL" | "ACTIVE" | "DEACTIVATED";
export type TabOption = "ALL" | "SALESMAN" | "STAFF" | "CUSTOMER" | "INVITATIONS";

interface UsersManagerProps {
  users: ManagedUser[];
  invitations: CustomerInvitationItem[];
  salesmen: Array<{ id: string; name: string; salesmanCode?: string | null }>;
  currentUserId: string;
}

export function UsersManager({
  users,
  invitations,
  salesmen,
  currentUserId,
}: UsersManagerProps) {
  const [userList, setUserList] = useState<ManagedUser[]>(users);
  const [invitationList, setInvitationList] = useState<CustomerInvitationItem[]>(invitations);
  const [activeTab, setActiveTab] = useState<TabOption>("ALL");
  const [roleFilter, setRoleFilter] = useState<RoleFilterOption>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalDefaultRole, setModalDefaultRole] = useState<"STAFF" | "SALESMAN" | "CUSTOMER" | "ADMIN">("STAFF");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; role: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setUserList(users);
  }, [users]);

  useEffect(() => {
    setInvitationList(invitations);
  }, [invitations]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, activeTab]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteUserAction(deleteTarget.id);
      if (res?.success) {
        setUserList((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setNotification({
          type: "success",
          message: `Account "${deleteTarget.name}" (${deleteTarget.role}) archived successfully.`,
        });
        setDeleteTarget(null);
      } else {
        setNotification({
          type: "error",
          message: res?.error || "Failed to delete user account.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "An unexpected error occurred during account deletion.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // =========================================================================
  // METRICS COMPUTATION (Across entire system)
  // =========================================================================
  const totalUsersCount = userList.length;
  const adminUsersCount = userList.filter((u) => u.role === "ADMIN").length;
  const salesmenUsers = userList.filter((u) => u.role === "SALESMAN");
  const salesmenCount = salesmenUsers.length;
  const activeSalesmenCount = salesmenUsers.filter((u) => u.active).length;

  const staffUsers = userList.filter((u) => u.role === "STAFF" || u.role === "STOCKER");
  const staffCount = staffUsers.length;
  const activeStaffCount = staffUsers.filter((u) => u.active).length;

  const customerUsers = userList.filter((u) => u.role === "CUSTOMER");
  const customersCount = customerUsers.length;
  const activeCustomersCount = customerUsers.filter((u) => u.active).length;
  const totalCustomerOrders = customerUsers.reduce((sum, c) => sum + (c._count?.customerOrders || 0), 0);

  const pendingInvitationsCount = invitationList.filter((i) => i.status === "PENDING").length;

  // =========================================================================
  // FILTERED USER LIST
  // =========================================================================
  const filteredUsers = useMemo(() => {
    return userList.filter((u) => {
      // 1. Tab filtering
      if (activeTab === "SALESMAN" && u.role !== "SALESMAN") return false;
      if (activeTab === "STAFF" && u.role !== "STAFF" && u.role !== "STOCKER") return false;
      if (activeTab === "CUSTOMER" && u.role !== "CUSTOMER") return false;

      // 2. Role filter pill
      if (roleFilter !== "ALL") {
        if (roleFilter === "STAFF" && u.role !== "STAFF" && u.role !== "STOCKER") return false;
        if (roleFilter === "ADMIN" && u.role !== "ADMIN") return false;
        if (roleFilter === "SALESMAN" && u.role !== "SALESMAN") return false;
        if (roleFilter === "CUSTOMER" && u.role !== "CUSTOMER") return false;
      }

      // 3. Status filter pill
      if (statusFilter === "ACTIVE" && !u.active) return false;
      if (statusFilter === "DEACTIVATED" && u.active) return false;

      // 4. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesMobile = u.mobile.includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesCode = u.salesmanCode ? u.salesmanCode.toLowerCase().includes(q) : false;
        const matchesCompany = u.companyName ? u.companyName.toLowerCase().includes(q) : false;
        const matchesGstin = u.gstin ? u.gstin.toLowerCase().includes(q) : false;
        const matchesCity = u.city ? u.city.toLowerCase().includes(q) : false;
        const matchesSalesman = u.salesman ? u.salesman.name.toLowerCase().includes(q) : false;

        return (
          matchesName ||
          matchesMobile ||
          matchesEmail ||
          matchesCode ||
          matchesCompany ||
          matchesGstin ||
          matchesCity ||
          matchesSalesman
        );
      }

      return true;
    });
  }, [userList, activeTab, roleFilter, statusFilter, search]);

  // Filtered Invitations
  const filteredInvitations = useMemo(() => {
    return invitationList.filter((inv) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        inv.customerName.toLowerCase().includes(q) ||
        inv.mobile.includes(q) ||
        inv.salesman.name.toLowerCase().includes(q) ||
        inv.status.toLowerCase().includes(q)
      );
    });
  }, [invitationList, search]);

  // Pagination slice
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getRoleBadge = (role: ManagedUser["role"]) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
            <Shield className="h-3 w-3 text-purple-600" />
            Super Admin
          </span>
        );
      case "SALESMAN":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 text-[#13789B] border border-sky-200 px-2 py-0.5 text-[10px] font-bold">
            <UserCheck className="h-3 w-3 text-[#13789B]" />
            Salesman
          </span>
        );
      case "CUSTOMER":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
            <Building2 className="h-3 w-3 text-emerald-600" />
            Customer
          </span>
        );
      case "STAFF":
      case "STOCKER":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
            <Boxes className="h-3 w-3 text-amber-600" />
            Loading & Stock Staff
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 max-w-full">
      {/* =========================================================================
          NOTIFICATION BANNER
      ========================================================================= */}
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
          TOP COMMAND HEADER & ACTIONS
      ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
              User & Access Control Center
            </h1>
            <span className="rounded-full bg-[#13789B]/10 px-2.5 py-0.5 text-xs font-bold text-[#13789B]">
              {totalUsersCount} Total Users · All Roles Active
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Create, manage and monitor Super Admins, Sales Representatives, Clients, and Loading & Stock Staff.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setModalDefaultRole("SALESMAN");
              setAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-[#13789B] shadow-xs hover:bg-sky-100 transition-all cursor-pointer"
          >
            <Users className="h-4 w-4 text-[#13789B]" />
            <span>+ Add Salesman</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalDefaultRole("STAFF");
              setAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-2xl bg-[#13789B] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0F627F] transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add New User</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TOP METRIC KPI CARDS (6 Comprehensive Metrics Across All 4 Roles)
      ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6 min-w-0">
        {/* Total Users */}
        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-[#111827] min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">All Accounts</span>
            <Users className="h-4 w-4 text-navy shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{totalUsersCount}</p>
          <span className="text-[10px] text-slate-400 truncate block">Unlimited accounts</span>
        </div>

        {/* Super Admins */}
        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-purple-600 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">Super Admins</span>
            <Shield className="h-4 w-4 text-purple-600 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-purple-700 truncate">{adminUsersCount}</p>
          <span className="text-[10px] text-slate-400 truncate block">Privileged access</span>
        </div>

        {/* Salesmen */}
        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-sky-500 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">Salesmen</span>
            <UserCheck className="h-4 w-4 text-[#13789B] shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#13789B] truncate">{salesmenCount}</p>
          <span className="text-[10px] text-emerald-600 font-semibold truncate block">
            {activeSalesmenCount} active representatives
          </span>
        </div>

        {/* Loading & Stock Staff */}
        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-amber-500 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">Loading & Stock</span>
            <Boxes className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-amber-700 truncate">{staffCount}</p>
          <span className="text-[10px] text-slate-400 truncate block">
            {activeStaffCount} active crew
          </span>
        </div>

        {/* Customers */}
        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-emerald-500 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">Clients & Builders</span>
            <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-700 truncate">{customersCount}</p>
          <span className="text-[10px] text-slate-400 truncate block">
            {totalCustomerOrders} orders placed
          </span>
        </div>

        {/* Pending Invitations */}
        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-teal-500 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase text-slate-500 truncate block">WhatsApp Invites</span>
            <Send className="h-4 w-4 text-teal-600 shrink-0" />
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-teal-700 truncate">{pendingInvitationsCount}</p>
          <span className="text-[10px] text-slate-400 truncate block">Pending links</span>
        </div>
      </div>

      {/* =========================================================================
          DIRECTORY SECTION TABS
      ========================================================================= */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2 min-w-0">
        {[
          { key: "ALL", label: `All Users (${totalUsersCount})`, icon: Users },
          { key: "SALESMAN", label: `Salesmen (${salesmenCount})`, icon: UserCheck },
          { key: "STAFF", label: `Loading & Stock Staff (${staffCount})`, icon: Boxes },
          { key: "CUSTOMER", label: `Customers & Builders (${customersCount})`, icon: Building2 },
          { key: "INVITATIONS", label: `Pending WhatsApp Invites (${pendingInvitationsCount})`, icon: Send },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as TabOption)}
            className={`flex items-center gap-1.5 rounded-2xl px-3 sm:px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-[#111827] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* =========================================================================
          TOOLBAR: SEARCH, ROLE FILTERS (Exact Section 2 Specification), STATUS
      ========================================================================= */}
      <div className="card rounded-3xl bg-white border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3 min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
          {/* Universal Search */}
          <div className="relative flex-1 max-w-lg min-w-0">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, mobile, company, GSTIN, salesman ID, or city..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs font-medium text-navy placeholder:text-slate-400 focus:bg-white focus:border-[#13789B] focus:outline-none transition-colors"
            />
          </div>

          {/* Role Filter & Status Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {/* Role Filter Pills: All Roles | Super Admin | Salesman | Customer | Loading & Stock Staff */}
            <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs">
              {(
                [
                  { key: "ALL", label: "All Roles" },
                  { key: "ADMIN", label: "Super Admin" },
                  { key: "SALESMAN", label: "Salesman" },
                  { key: "CUSTOMER", label: "Customer" },
                  { key: "STAFF", label: "Loading & Stock Staff" },
                ] as const
              ).map((rf) => (
                <button
                  key={rf.key}
                  type="button"
                  onClick={() => setRoleFilter(rf.key)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    roleFilter === rf.key
                      ? "bg-white text-navy shadow-xs"
                      : "text-slate-500 hover:text-navy"
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>

            {/* Status Filter: All Status | Active | Deactivated */}
            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs">
              {(
                [
                  { key: "ALL", label: "All Status" },
                  { key: "ACTIVE", label: "Active" },
                  { key: "DEACTIVATED", label: "Disabled" },
                ] as const
              ).map((sf) => (
                <button
                  key={sf.key}
                  type="button"
                  onClick={() => setStatusFilter(sf.key)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === sf.key
                      ? "bg-white text-navy shadow-xs"
                      : "text-slate-500 hover:text-navy"
                  }`}
                >
                  {sf.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1 TO 4: USER ACCOUNTS DIRECTORY (Desktop Table + Mobile Cards)
      ========================================================================= */}
      {activeTab !== "INVITATIONS" && (
        <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden min-w-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs min-w-[880px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Account User</th>
                  <th className="py-3 px-4">Role Badge</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Role Association & Stats</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-center">Login Access</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* User Details */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#13789B]/10 text-[#13789B] font-black text-xs shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-navy block truncate">{u.name}</span>
                          {u.salesmanCode && (
                            <span className="font-mono text-[10px] font-bold text-[#13789B] block">
                              ID: {u.salesmanCode}
                            </span>
                          )}
                          {u.remarks && (
                            <span className="text-[10px] text-slate-400 italic block truncate max-w-[180px]">
                              {u.remarks}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Assigned Role */}
                    <td className="py-3 px-4">
                      {getRoleBadge(u.role)}
                    </td>

                    {/* Contact Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-mono text-slate-700">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{u.mobile}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      {u.city && (
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          📍 {u.city}, {u.state || "Gujarat"}
                        </span>
                      )}
                    </td>

                    {/* Role Association & Metrics */}
                    <td className="py-3 px-4">
                      {u.role === "SALESMAN" ? (
                        <div>
                          <span className="inline-block rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            {u._count.assignedCustomers} Assigned Customers
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {u._count.salesmanOrders} orders placed
                          </span>
                        </div>
                      ) : u.role === "CUSTOMER" ? (
                        <div>
                          <p className="font-bold text-navy text-[11px] truncate max-w-[160px]">
                            {u.companyName || <span className="text-slate-400 italic font-normal">No Company</span>}
                          </p>
                          {u.salesman ? (
                            <span className="text-[10px] text-[#13789B] font-semibold block truncate">
                              Salesman: {u.salesman.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic block">Direct Client</span>
                          )}
                          <Link
                            href={`/admin/orders?q=${encodeURIComponent(u.name)}`}
                            className="text-[10px] font-bold text-[#13789B] hover:underline"
                          >
                            {u._count.customerOrders} orders →
                          </Link>
                        </div>
                      ) : u.role === "STAFF" || u.role === "STOCKER" ? (
                        <div>
                          <span className="inline-block rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Yard Operations
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {u._count.assignedOrders} assigned loading tasks
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-purple-700">
                          Full ERP Administration
                        </span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
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

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {u.id !== currentUserId ? (
                        <div className="inline-flex items-center gap-1.5">
                          {u.role === "SALESMAN" && (
                            <Link
                              href={`/admin/salesmen/${u.id}`}
                              className="rounded-xl bg-slate-100 hover:bg-[#13789B] hover:text-white px-2.5 py-1 text-xs font-bold text-slate-700 transition"
                              title="Manage Salesman Portfolio"
                            >
                              Manage
                            </Link>
                          )}

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
                              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                                u.active
                                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              }`}
                            >
                              {u.active ? "Disable" : "Enable"}
                            </button>
                          </form>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: u.id, name: u.name, role: u.role })}
                            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                            title="Safely Archive / Delete Account"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold italic">
                          Current Admin
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                      <p className="font-bold text-sm text-slate-600">No users match the selected filters.</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or role filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100 min-w-0">
            {paginatedUsers.map((u) => (
              <div key={u.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#13789B]/10 text-[#13789B] font-black text-xs shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-navy text-xs truncate">{u.name}</p>
                      {u.salesmanCode && (
                        <span className="font-mono text-[10px] font-bold text-[#13789B] block">
                          ID: {u.salesmanCode}
                        </span>
                      )}
                      <div className="mt-0.5">{getRoleBadge(u.role)}</div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                      u.active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {u.active ? "Active" : "Disabled"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-semibold block truncate">Phone & City</span>
                    <span className="text-slate-700 text-[11px] font-mono block truncate">{u.mobile}</span>
                    <span className="text-slate-500 text-[10px] block truncate">{u.city || "Gujarat"}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-semibold block truncate">Role Details</span>
                    {u.role === "SALESMAN" ? (
                      <span className="text-[#13789B] font-bold text-[10px] block truncate">
                        {u._count.assignedCustomers} clients · {u._count.salesmanOrders} orders
                      </span>
                    ) : u.role === "CUSTOMER" ? (
                      <span className="text-emerald-700 font-bold text-[10px] block truncate">
                        {u.companyName || "Client"} ({u._count.customerOrders} orders)
                      </span>
                    ) : (
                      <span className="text-slate-600 text-[10px] block truncate">
                        {u.role === "ADMIN" ? "Super Admin" : "Loading Operations"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{u.email}</span>
                  {u.id !== currentUserId ? (
                    <div className="flex items-center gap-1.5">
                      {u.role === "SALESMAN" && (
                        <Link
                          href={`/admin/salesmen/${u.id}`}
                          className="rounded-xl bg-slate-100 hover:bg-[#13789B] hover:text-white px-2.5 py-1 text-xs font-bold text-slate-700 transition"
                        >
                          Manage
                        </Link>
                      )}

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
                          className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                            u.active
                              ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          {u.active ? "Disable" : "Enable"}
                        </button>
                      </form>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: u.id, name: u.name, role: u.role })}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                        title="Delete account"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold italic">Current Admin</span>
                  )}
                </div>
              </div>
            ))}

            {paginatedUsers.length === 0 && (
              <div className="py-8 text-center text-slate-400">
                <p className="font-bold text-xs">No matching user accounts found.</p>
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>

              <div className="text-xs font-semibold text-slate-500">
                Page <span className="font-bold text-navy">{currentPage}</span> of{" "}
                <span className="font-bold text-navy">{totalPages}</span> ({filteredUsers.length} total)
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: PENDING WHATSAPP INVITATIONS DIRECTORY
      ========================================================================= */}
      {activeTab === "INVITATIONS" && (
        <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden min-w-0">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h2 className="text-sm font-black text-navy flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-600" />
              Salesman Customer WhatsApp Invitations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure onboarding invitation links sent by Salesmen to customers. Tokens automatically link the customer upon signup.
            </p>
          </div>

          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Invited Customer</th>
                  <th className="py-3 px-4">Inviting Salesman</th>
                  <th className="py-3 px-4">Invitation Status</th>
                  <th className="py-3 px-4">Generated Date</th>
                  <th className="py-3 px-4">Expires On</th>
                  <th className="py-3 px-4 text-right">Invitation Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-navy block">{inv.customerName}</span>
                      <span className="text-[11px] font-mono text-slate-500">{inv.mobile}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-[#13789B] block">{inv.salesman.name}</span>
                      {inv.salesman.salesmanCode && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {inv.salesman.salesmanCode}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          inv.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : inv.status === "ACCEPTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {inv.status === "PENDING" ? (
                          <>
                            <Clock className="h-3 w-3 text-amber-600" /> Pending Signup
                          </>
                        ) : inv.status === "ACCEPTED" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Registered
                          </>
                        ) : (
                          inv.status
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDate(inv.createdAt)}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDate(inv.expiresAt)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {inv.status === "PENDING" ? (
                        <a
                          href={`/invite/${inv.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 text-xs font-bold transition border border-emerald-200"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Complete</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredInvitations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No customer invitations match the current query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD USER MODAL (Supports all 4 roles)
      ========================================================================= */}
      {addModalOpen && (
        <AddStaffModal
          onClose={() => setAddModalOpen(false)}
          salesmen={salesmen}
          defaultRole={modalDefaultRole}
        />
      )}

      {/* =========================================================================
          CONFIRM DELETE MODAL
      ========================================================================= */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title="Archive User Account"
        itemName={deleteTarget ? `${deleteTarget.name} (${deleteTarget.role})` : ""}
        message="Are you sure you want to archive this user account? Historical orders, site records and dispatches will be preserved."
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
