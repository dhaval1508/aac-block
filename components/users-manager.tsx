/* eslint-disable @next/next/no-img-element */
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
  Eye,
  Edit,
  KeyRound,
  Filter,
  ArrowUpDown,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatDate, formatDateTime, initials } from "@/lib/utils";
import { toggleUserAction, deleteUserAction } from "@/lib/actions/users";
import { AddStaffModal } from "@/components/add-staff-modal";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { UserProfileModal } from "@/components/user-profile-modal";
import { EditUserModal } from "@/components/edit-user-modal";
import { ResetPasswordModal } from "@/components/reset-password-modal";

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
  billingAddress?: string | null;
  deliveryAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: Date | string | null;
  remarks?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
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
export type DateFilterOption = "ALL" | "7D" | "30D" | "THIS_MONTH" | "THIS_YEAR";
export type SortOption = "NEWEST" | "OLDEST" | "NAME_ASC" | "NAME_DESC" | "ROLE" | "ORDERS";
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
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("NEWEST");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalDefaultRole, setModalDefaultRole] = useState<"STAFF" | "SALESMAN" | "CUSTOMER" | "ADMIN">("STAFF");
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<ManagedUser | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<ManagedUser | null>(null);
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<ManagedUser | null>(null);
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
      const timer = setTimeout(() => setNotification(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, dateFilter, sortOption, activeTab]);

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
        if (selectedUserForProfile?.id === deleteTarget.id) {
          setSelectedUserForProfile(null);
        }
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

  const handleToggleUserStatus = async (user: ManagedUser) => {
    if (user.id === currentUserId) {
      setNotification({
        type: "error",
        message: "You cannot disable your own active Super Admin account.",
      });
      return;
    }

    const actionText = user.active ? "disable" : "enable";
    if (!window.confirm(`Are you sure you want to ${actionText} login access for "${user.name}"?`)) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("id", user.id);
      // Call action
      const newActive = !user.active;
      // Optimistic in-place update
      setUserList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: newActive } : u))
      );
      if (selectedUserForProfile?.id === user.id) {
        setSelectedUserForProfile((prev) => (prev ? { ...prev, active: newActive } : null));
      }

      await toggleUserAction(formData);

      setNotification({
        type: "success",
        message: `Account "${user.name}" is now ${newActive ? "Active" : "Disabled"}.`,
      });
    } catch (err: any) {
      // Revert if error
      setUserList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: user.active } : u))
      );
      setNotification({
        type: "error",
        message: err?.message || "Failed to update account status.",
      });
    }
  };

  const handleProfileUpdated = (updatedUser: ManagedUser, message: string) => {
    setUserList((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
    );
    if (selectedUserForProfile?.id === updatedUser.id) {
      setSelectedUserForProfile(updatedUser);
    }
    setNotification({
      type: "success",
      message,
    });
  };

  // =========================================================================
  // METRICS COMPUTATION (Across entire system)
  // =========================================================================
  const totalUsersCount = userList.length;
  const activeUsersCount = userList.filter((u) => u.active).length;
  const disabledUsersCount = userList.filter((u) => !u.active).length;

  const adminUsers = userList.filter((u) => u.role === "ADMIN");
  const adminUsersCount = adminUsers.length;

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
  // FILTERED & SORTED USER LIST
  // =========================================================================
  const filteredUsers = useMemo(() => {
    const now = new Date();

    const filtered = userList.filter((u) => {
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

      // 4. Registration Date filter
      if (dateFilter !== "ALL") {
        const uDate = new Date(u.createdAt);
        if (dateFilter === "7D") {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (uDate < sevenDaysAgo) return false;
        } else if (dateFilter === "30D") {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (uDate < thirtyDaysAgo) return false;
        } else if (dateFilter === "THIS_MONTH") {
          if (uDate.getMonth() !== now.getMonth() || uDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (dateFilter === "THIS_YEAR") {
          if (uDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // 5. Universal Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesId = u.id.toLowerCase().includes(q);
        const matchesMobile = u.mobile.includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesCode = u.salesmanCode ? u.salesmanCode.toLowerCase().includes(q) : false;
        const matchesCompany = u.companyName ? u.companyName.toLowerCase().includes(q) : false;
        const matchesGstin = u.gstin ? u.gstin.toLowerCase().includes(q) : false;
        const matchesCity = u.city ? u.city.toLowerCase().includes(q) : false;
        const matchesSalesman = u.salesman ? u.salesman.name.toLowerCase().includes(q) : false;

        return (
          matchesName ||
          matchesId ||
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

    // 6. Sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "NEWEST":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "OLDEST":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "NAME_ASC":
          return a.name.localeCompare(b.name);
        case "NAME_DESC":
          return b.name.localeCompare(a.name);
        case "ROLE":
          return a.role.localeCompare(b.role);
        case "ORDERS": {
          const aOrders = (a._count?.customerOrders || 0) + (a._count?.salesmanOrders || 0);
          const bOrders = (b._count?.customerOrders || 0) + (b._count?.salesmanOrders || 0);
          return bOrders - aOrders;
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [userList, activeTab, roleFilter, statusFilter, dateFilter, sortOption, search]);

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
      case "STOCKER":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
            <Boxes className="h-3 w-3 text-amber-600" />
            Stocker
          </span>
        );
      case "STAFF":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">
            <Boxes className="h-3 w-3 text-slate-600" />
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
              {totalUsersCount} Total Users · {activeUsersCount} Active · {disabledUsersCount} Disabled
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Provision, inspect complete profiles, edit user permissions, and audit security actions.
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
            <span>+ Add User Account</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUMMARY METRIC CARDS
      ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 min-w-0">
        {/* All Accounts */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">All Accounts</span>
            <Users className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-navy">{totalUsersCount}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>{activeUsersCount} active · {disabledUsersCount} disabled</span>
          </div>
        </div>

        {/* Super Admins */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Super Admins</span>
            <Shield className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-navy">{adminUsersCount}</div>
          <div className="mt-1 text-[11px] text-purple-700 font-semibold">Privileged access</div>
        </div>

        {/* Salesmen */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#13789B]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Salesmen</span>
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-navy">{salesmenCount}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-semibold">{activeSalesmenCount} active representatives</div>
        </div>

        {/* Loading & Stock */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Loading & Stock</span>
            <Boxes className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-navy">{staffCount}</div>
          <div className="mt-1 text-[11px] text-amber-700 font-semibold">{activeStaffCount} active crew</div>
        </div>

        {/* Clients & Builders */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clients & Builders</span>
            <Building2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-navy">{customersCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">{totalCustomerOrders} orders placed</div>
        </div>

        {/* WhatsApp Invites */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-teal-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WhatsApp Invites</span>
            <Send className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-navy">{pendingInvitationsCount}</div>
          <div className="mt-1 text-[11px] text-teal-700 font-semibold">Pending links</div>
        </div>
      </div>

      {/* =========================================================================
          TAB SELECTION
      ========================================================================= */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2 min-w-0">
        {(
          [
            { key: "ALL", label: `All Users (${totalUsersCount})`, icon: Users },
            { key: "SALESMAN", label: `Salesmen (${salesmenCount})`, icon: UserCheck },
            { key: "STAFF", label: `Loading & Stock Staff (${staffCount})`, icon: Boxes },
            { key: "CUSTOMER", label: `Customers & Builders (${customersCount})`, icon: Building2 },
            { key: "INVITATIONS", label: `Pending WhatsApp Invites (${pendingInvitationsCount})`, icon: Send },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-navy text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* =========================================================================
          TOOLBAR: SEARCH, ROLE FILTERS, STATUS, DATE & SORTING
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
              placeholder="Search by name, email, mobile, ID, company, GSTIN, salesman..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs font-medium text-navy placeholder:text-slate-400 focus:bg-white focus:border-[#13789B] focus:outline-none transition-colors"
            />
          </div>

          {/* Controls: Role, Status, Sort & Date Filters */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {/* Role Filter Pills */}
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

            {/* Status Filter */}
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

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs">
              <span className="px-1 text-slate-400 font-bold flex items-center">
                <ArrowUpDown className="h-3.5 w-3.5 mr-0.5" />
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-transparent text-xs font-bold text-navy outline-none cursor-pointer pr-1"
              >
                <option value="NEWEST">Joined (Newest First)</option>
                <option value="OLDEST">Joined (Oldest First)</option>
                <option value="NAME_ASC">Name (A → Z)</option>
                <option value="NAME_DESC">Name (Z → A)</option>
                <option value="ROLE">Role</option>
                <option value="ORDERS">Orders Count</option>
              </select>
            </div>

            {/* Registration Date Filter */}
            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs">
              <span className="px-1 text-slate-400 font-bold flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-0.5" />
              </span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
                className="bg-transparent text-xs font-bold text-navy outline-none cursor-pointer pr-1"
              >
                <option value="ALL">All Time</option>
                <option value="7D">Past 7 Days</option>
                <option value="30D">Past 30 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="THIS_YEAR">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          USER ACCOUNTS DIRECTORY (Desktop Table + Mobile Cards)
      ========================================================================= */}
      {activeTab !== "INVITATIONS" && (
        <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden min-w-0">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs min-w-[980px]">
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
                    {/* User Details (Clickable to open profile) */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setSelectedUserForProfile(u)}
                        className="flex items-center gap-2.5 text-left group-hover:opacity-90 cursor-pointer"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#13789B]/10 text-[#13789B] font-black text-xs shrink-0 border border-[#13789B]/20 overflow-hidden">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                          ) : (
                            initials(u.name)
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-navy hover:text-[#13789B] transition block truncate">
                            {u.name}
                          </span>
                          {u.salesmanCode && (
                            <span className="font-mono text-[10px] font-bold text-[#13789B] block">
                              Code: {u.salesmanCode}
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-slate-400 block truncate max-w-[170px]">
                            ID: {u.id}
                          </span>
                        </div>
                      </button>
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
                        <span className="text-[10px] text-slate-500 block mt-0.5 truncate max-w-[180px]">
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
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {u._count.salesmanOrders} orders placed
                          </span>
                        </div>
                      ) : u.role === "CUSTOMER" ? (
                        <div>
                          <span className="font-bold text-navy text-[11px] block truncate max-w-[180px]">
                            {u.companyName || u.name}
                          </span>
                          {u.salesman ? (
                            <span className="text-[10px] text-slate-500 block">
                              Salesman: <span className="font-semibold text-slate-700">{u.salesman.name}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic block">Direct Client</span>
                          )}
                          <span className="text-[10px] font-bold text-[#13789B] block">
                            {u._count.customerOrders} orders →
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-slate-600 text-xs font-semibold block">
                            {u.role === "ADMIN" ? "Super Admin" : "Loading Operations"}
                          </span>
                          {u.lastLoginAt ? (
                            <span className="text-[10px] text-slate-400 block">
                              Active: {formatDate(u.lastLoginAt)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic block">No login recorded</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {formatDate(u.createdAt)}
                    </td>

                    {/* Login Access Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          u.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
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

                    {/* Actions: View, Edit, Password Reset, Toggle, Delete */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* View Profile */}
                        <button
                          type="button"
                          onClick={() => setSelectedUserForProfile(u)}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-[#13789B] hover:text-white px-2.5 py-1 text-xs font-bold text-slate-700 transition cursor-pointer"
                          title="Open Complete User Profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>

                        {/* Edit User */}
                        <button
                          type="button"
                          onClick={() => setSelectedUserForEdit(u)}
                          className="inline-flex items-center gap-1 rounded-xl bg-sky-50 text-[#13789B] hover:bg-[#13789B] hover:text-white px-2.5 py-1 text-xs font-bold transition border border-sky-200 cursor-pointer"
                          title="Edit User Details & Permissions"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Password Reset */}
                        <button
                          type="button"
                          onClick={() => setSelectedUserForPasswordReset(u)}
                          className="inline-flex items-center justify-center rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white p-1 text-xs font-bold transition border border-amber-200 cursor-pointer"
                          title="Reset User Password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>

                        {/* Status Toggle & Delete (Protected for current user) */}
                        {u.id !== currentUserId ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                                u.active
                                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              }`}
                              title={u.active ? "Disable login access" : "Enable login access"}
                            >
                              {u.active ? "Disable" : "Enable"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ id: u.id, name: u.name, role: u.role })}
                              className="inline-flex items-center justify-center rounded-xl bg-rose-50 p-1 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                              title="Safely Archive / Delete Account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-purple-700 font-bold px-1.5 py-0.5 rounded-lg bg-purple-50 border border-purple-200">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                      <p className="font-bold text-sm text-slate-600">No users match the selected filters.</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or adjusting role/date filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Cards View */}
          <div className="lg:hidden divide-y divide-slate-100 min-w-0">
            {paginatedUsers.map((u) => (
              <div key={u.id} className="p-3.5 sm:p-4 space-y-2.5 min-w-0">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForProfile(u)}
                    className="flex items-center gap-2.5 min-w-0 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#13789B]/10 text-[#13789B] font-black text-sm shrink-0 border border-[#13789B]/20 overflow-hidden">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                      ) : (
                        initials(u.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-navy text-sm block truncate">{u.name}</span>
                      <span className="font-mono text-[10px] text-slate-400 block truncate">ID: {u.id}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {getRoleBadge(u.role)}
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {u.active ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile</span>
                    <span className="font-mono font-bold text-slate-800">{u.mobile}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Joined</span>
                    <span className="font-medium text-slate-700">{formatDate(u.createdAt)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                    <span className="text-[11px] text-slate-700 truncate block">{u.email}</span>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForProfile(u)}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-[#13789B] hover:text-white px-3 py-1.5 text-xs font-bold text-slate-700 transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedUserForEdit(u)}
                    className="inline-flex items-center gap-1 rounded-xl bg-sky-50 text-[#13789B] hover:bg-[#13789B] hover:text-white px-3 py-1.5 text-xs font-bold transition border border-sky-200"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedUserForPasswordReset(u)}
                    className="inline-flex items-center gap-1 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white px-2 py-1.5 text-xs font-bold transition border border-amber-200"
                    title="Reset Password"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </button>

                  {u.id !== currentUserId ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(u)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          u.active
                            ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        {u.active ? "Disable" : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: u.id, name: u.name, role: u.role })}
                        className="inline-flex items-center justify-center rounded-xl bg-rose-50 p-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                        title="Delete account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-purple-700 font-bold px-2 py-1 rounded-lg bg-purple-50 border border-purple-200">
                      Logged in Admin
                    </span>
                  )}
                </div>
              </div>
            ))}

            {paginatedUsers.length === 0 && (
              <div className="py-8 text-center text-slate-400">
                <Users className="mx-auto h-8 w-8 text-slate-300 mb-1" />
                <p className="font-bold text-xs text-slate-600">No users match filters</p>
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="border-t border-slate-200 bg-slate-50/70 p-3 sm:p-4 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <span className="font-bold text-navy">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-bold text-navy">{Math.min(currentPage * pageSize, filteredUsers.length)}</span> of{" "}
                <span className="font-bold text-navy">{filteredUsers.length}</span> registered users
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <span className="px-2 font-bold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
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
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: PENDING WHATSAPP INVITATIONS
      ========================================================================= */}
      {activeTab === "INVITATIONS" && (
        <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden min-w-0">
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Invited Customer</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4">Invited By Salesman</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sent Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-navy">{inv.customerName}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{inv.mobile}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">{inv.salesman.name}</span>
                      {inv.salesman.salesmanCode && (
                        <span className="font-mono text-[10px] text-slate-400 block">
                          {inv.salesman.salesmanCode}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          inv.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : inv.status === "ACCEPTED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(inv.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`https://wa.me/91${inv.mobile.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-xs font-bold hover:bg-emerald-100 transition"
                      >
                        <Send className="h-3 w-3" /> Resend
                      </a>
                    </td>
                  </tr>
                ))}

                {filteredInvitations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No invitations found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
      ========================================================================= */}
      {/* 1. Add User / Staff Modal */}
      {addModalOpen && (
        <AddStaffModal
          onClose={() => setAddModalOpen(false)}
          salesmen={salesmen}
          defaultRole={modalDefaultRole}
        />
      )}

      {/* 2. User Profile Modal */}
      {selectedUserForProfile && (
        <UserProfileModal
          user={selectedUserForProfile}
          currentUserId={currentUserId}
          onClose={() => setSelectedUserForProfile(null)}
          onEdit={(u) => setSelectedUserForEdit(u)}
          onResetPassword={(u) => setSelectedUserForPasswordReset(u)}
          onToggleStatus={(u) => handleToggleUserStatus(u)}
          onDelete={(u) => setDeleteTarget({ id: u.id, name: u.name, role: u.role })}
        />
      )}

      {/* 3. Edit User Modal */}
      {selectedUserForEdit && (
        <EditUserModal
          user={selectedUserForEdit}
          salesmen={salesmen}
          currentUserId={currentUserId}
          onClose={() => setSelectedUserForEdit(null)}
          onSuccess={handleProfileUpdated}
        />
      )}

      {/* 4. Reset Password Modal */}
      {selectedUserForPasswordReset && (
        <ResetPasswordModal
          user={selectedUserForPasswordReset}
          onClose={() => setSelectedUserForPasswordReset(null)}
          onSuccess={(msg) => setNotification({ type: "success", message: msg })}
        />
      )}

      {/* 5. Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title="Archive / Delete User Account"
        itemName={deleteTarget?.name}
        message={`Are you sure you want to deactivate and archive ${deleteTarget?.name} (${deleteTarget?.role})? This will revoke active logins while safely preserving historical dispatches, invoices, and accounting records.`}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
