/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User as UserIcon,
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Edit,
  KeyRound,
  Trash2,
  History,
  ShoppingBag,
  Users,
  Boxes,
  Truck,
  FileText,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { formatDate, formatDateTime, initials } from "@/lib/utils";
import type { ManagedUser } from "@/components/users-manager";
import { getUserAuditHistoryAction } from "@/lib/actions/users";

interface UserProfileModalProps {
  user: ManagedUser;
  currentUserId: string;
  onClose: () => void;
  onEdit: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onToggleStatus: (user: ManagedUser) => void;
  onDelete: (user: ManagedUser) => void;
}

export function UserProfileModal({
  user,
  currentUserId,
  onClose,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"DETAILS" | "PERMISSIONS" | "AUDIT">("DETAILS");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (activeTab === "AUDIT") {
      setLoadingAudit(true);
      getUserAuditHistoryAction(user.id)
        .then((res) => {
          if (res.success && res.logs) {
            setAuditLogs(res.logs);
          }
        })
        .finally(() => setLoadingAudit(false));
    }
  }, [activeTab, user.id]);

  const getRoleBadge = (role: ManagedUser["role"]) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700 border border-purple-200">
            <Shield className="h-3.5 w-3.5" /> Super Admin
          </span>
        );
      case "SALESMAN":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 border border-blue-200">
            <Users className="h-3.5 w-3.5" /> Sales Representative
          </span>
        );
      case "CUSTOMER":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
            <Building2 className="h-3.5 w-3.5" /> Client / Builder
          </span>
        );
      case "STOCKER":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 border border-amber-200">
            <Boxes className="h-3.5 w-3.5" /> Stock & Inventory Manager
          </span>
        );
      case "STAFF":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 border border-slate-200">
            <Truck className="h-3.5 w-3.5" /> Loading & Yard Staff
          </span>
        );
    }
  };

  // Permission Matrix based on Role
  const permissionsByRole: Record<ManagedUser["role"], Array<{ title: string; desc: string; granted: boolean }>> = {
    ADMIN: [
      { title: "User & Access Management", desc: "Create, view, edit, reset passwords, and archive accounts", granted: true },
      { title: "Order Pipeline & Pricing", desc: "View all factory orders, set unit rates, edit items & commercials", granted: true },
      { title: "Financials & Tax Invoices", desc: "Access GST billing, download official invoices, record payments", granted: true },
      { title: "Factory Yard & Weighbridge", desc: "Supervise loading, inspect weighbridge slips, stage dispatches", granted: true },
      { title: "Stock & Inventory Control", desc: "Log stock in/out, view CBM breakdown, manage block varieties", granted: true },
      { title: "Company Profile & System Audit", desc: "Update registered GST details, bank accounts, view audit trails", granted: true },
    ],
    SALESMAN: [
      { title: "Direct Order Creation", desc: "Place AAC block and mortar orders on behalf of assigned clients", granted: true },
      { title: "Client Portfolio Management", desc: "Onboard new builders, invite via WhatsApp, manage customer info", granted: true },
      { title: "Order & Dispatch Tracking", desc: "Track live status of assigned orders from staging to delivery", granted: true },
      { title: "Commercials & Pricing", desc: "View pricing details for self-created or authorized accounts", granted: true },
      { title: "User Administration", desc: "Cannot manage users or modify system permissions", granted: false },
      { title: "Yard & Weighbridge Controls", desc: "No permission to edit physical dispatch or weighbridge slips", granted: false },
    ],
    STAFF: [
      { title: "Yard Dispatch & Loading", desc: "Verify truck assignments, stage blocks, record physical loading", granted: true },
      { title: "Weighbridge Weight Slips", desc: "Upload weighbridge slips, enter gross/tare/net weighbridge metrics", granted: true },
      { title: "Delivery Challan Handover", desc: "Print delivery challans and verify driver dispatch documents", granted: true },
      { title: "Order Pipeline Visibility", desc: "View assigned orders scheduled for plant loading", granted: true },
      { title: "Financials & Commercial Pricing", desc: "Strictly restricted from viewing order rates or invoicing", granted: false },
      { title: "User Management", desc: "No permission to manage system accounts", granted: false },
    ],
    STOCKER: [
      { title: "Stock Intake & Factory Movements", desc: "Record daily block production and adhesive mortar bag additions", granted: true },
      { title: "Block Inventory Breakdown", desc: "Monitor yard stock by size, cubic meter volume (CBM), and block counts", granted: true },
      { title: "Stock Reconciliation", desc: "Perform inventory reconciliations and audit delta logs", granted: true },
      { title: "Financial Invoicing", desc: "Restricted from customer commercial billing and invoices", granted: false },
      { title: "User Management", desc: "No permission to manage system accounts", granted: false },
    ],
    CUSTOMER: [
      { title: "Direct Material Orders", desc: "Place factory orders for AAC Blocks and Jointing Mortar bags", granted: true },
      { title: "Delivery Site Locations", desc: "Provide delivery address, pin GPS coordinates, and Google Maps links", granted: true },
      { title: "Live Order Tracking", desc: "Track stages from pending to confirmed, loading, in-transit, delivered", granted: true },
      { title: "Invoice & Challan Access", desc: "Download verified GST Tax Invoices and Delivery Challans", granted: true },
      { title: "System Administration", desc: "Customer account isolated strictly to own operational data", granted: false },
    ],
  };

  const isCurrentAdmin = user.id === currentUserId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 rounded-2xl bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-10">
            {/* Avatar / Photo */}
            <div className="relative shrink-0">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#13789B] to-[#0B192C] text-white font-black text-xl sm:text-2xl shadow-lg border-2 border-white/20">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full rounded-3xl object-cover" />
                ) : (
                  initials(user.name)
                )}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-slate-900 ${
                  user.active ? "bg-emerald-500" : "bg-rose-500"
                }`}
                title={user.active ? "Active account" : "Disabled account"}
              />
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white truncate">{user.name}</h2>
                {getRoleBadge(user.role)}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    user.active ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {user.active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {user.active ? "Active Account" : "Access Disabled"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-1">
                  <span className="font-mono text-slate-400">ID:</span>
                  <span className="font-mono text-white/90">{user.id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(user.id, "userId")}
                    className="p-1 hover:text-white"
                    title="Copy user ID"
                  >
                    {copiedField === "userId" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1 text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Joined {formatDate(user.createdAt)}</span>
                </div>
                {user.lastLoginAt ? (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1 text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Last login: {formatDateTime(user.lastLoginAt)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span>•</span>
                    <span className="text-slate-400 italic">Never logged in</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Header Action Pills */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(user);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-bold transition"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onResetPassword(user);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 text-xs font-bold transition"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Reset Password</span>
            </button>

            {!isCurrentAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => onToggleStatus(user)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    user.active
                      ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {user.active ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>{user.active ? "Disable Access" : "Enable Access"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(user);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700/50 px-3 py-1.5 text-xs font-bold transition ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Account</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 px-5 sm:px-6 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("DETAILS")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "DETAILS"
                ? "border-[#13789B] text-[#13789B] bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>Profile Details & Contact</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PERMISSIONS")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "PERMISSIONS"
                ? "border-[#13789B] text-[#13789B] bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Role & Permissions</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("AUDIT")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "AUDIT"
                ? "border-[#13789B] text-[#13789B] bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="h-4 w-4" />
            <span>Audit & Change History</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "DETAILS" && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Direct Contact & Communications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
                    <Mail className="h-4 w-4 text-[#13789B] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Email Address</span>
                      <a href={`mailto:${user.email}`} className="text-xs font-bold text-slate-900 hover:underline truncate block">
                        {user.email}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(user.email, "email")}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title="Copy email"
                    >
                      {copiedField === "email" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
                    <Phone className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Mobile Number</span>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${user.mobile}`} className="text-xs font-bold text-slate-900 hover:underline">
                          {user.mobile}
                        </a>
                        <a
                          href={`https://wa.me/91${user.mobile.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 inline-flex items-center gap-0.5"
                          title="Open WhatsApp chat"
                        >
                          <MessageSquare className="h-2.5 w-2.5" /> WhatsApp
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(user.mobile, "mobile")}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title="Copy mobile"
                    >
                      {copiedField === "mobile" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Organization & GST */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Organization & Commercial Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Company / Firm Name</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {user.companyName || "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">GSTIN / Tax Identification</span>
                    <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                      {user.gstin ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span>{user.gstin}</span>
                          <span className="rounded bg-emerald-100 text-emerald-800 px-1 text-[10px] font-bold">GST Active</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Registered Site & Billing Address
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Delivery Site Address
                    </span>
                    <p className="text-xs text-slate-800 font-medium">
                      {user.deliveryAddress || "—"}
                    </p>
                    <div className="text-[11px] text-slate-500 font-medium pt-1">
                      {user.city ? `${user.city}, ` : ""}{user.state || "Gujarat"}{user.pincode ? ` - ${user.pincode}` : ""}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> Official Billing Address
                    </span>
                    <p className="text-xs text-slate-800 font-medium">
                      {user.billingAddress || user.deliveryAddress || "—"}
                    </p>
                    <div className="text-[11px] text-slate-500 font-medium pt-1">
                      {user.city ? `${user.city}, ` : ""}{user.state || "Gujarat"}{user.pincode ? ` - ${user.pincode}` : ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Specifics */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Account Associations & Role Attributes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {user.role === "CUSTOMER" && (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Sales Representative</span>
                      {user.salesman ? (
                        <div className="mt-1 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{user.salesman.name}</p>
                            <p className="text-[10px] font-mono text-slate-500">{user.salesman.salesmanCode || "Code N/A"}</p>
                          </div>
                          <Link
                            href={`/admin/salesmen/${user.salesman.id}`}
                            className="text-xs font-bold text-[#13789B] hover:underline flex items-center gap-0.5"
                          >
                            View Salesman →
                          </Link>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic mt-1">Direct Client (Unassigned)</p>
                      )}
                    </div>
                  )}

                  {user.role === "SALESMAN" && (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Salesman Reference Code</span>
                      <p className="text-xs font-mono font-bold text-slate-900 mt-1">
                        {user.salesmanCode || "Not generated"}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Operational Remarks / Internal Notes</span>
                    <p className="text-xs text-slate-700 italic mt-1">
                      {user.remarks || "No internal notes recorded."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Operational Stats */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Live Operational Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Orders</span>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{user._count?.customerOrders || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Sales Orders</span>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{user._count?.salesmanOrders || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Clients</span>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{user._count?.assignedCustomers || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Yard Staged Orders</span>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{user._count?.assignedOrders || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "PERMISSIONS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block">Active System Role</span>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(user.role)}
                    <span className="text-xs text-slate-600 font-medium">
                      Access rights are strictly enforced on all server actions and API endpoints.
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pt-2">
                Assigned Operational Capabilities
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {permissionsByRole[user.role]?.map((perm, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl p-4 border flex items-start gap-3 ${
                      perm.granted ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-60"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                        perm.granted ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {perm.granted ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{perm.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{perm.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "AUDIT" && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Account Changes & Security Trail
              </h3>

              {loadingAudit ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading security and change audit history...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center text-slate-400">
                  <History className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">No recorded audit events yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Profile updates, role promotions, and password resets will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditLogs.map((log) => {
                    const changes = log.details?.changedFields || {};
                    return (
                      <div key={log.id} className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-slate-400">{formatDateTime(log.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Performed by: <span className="font-semibold text-slate-700">{log.actor?.name || log.details?.actorName || "Super Admin"}</span>
                        </p>
                        {Object.keys(changes).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                            {Object.entries(changes).map(([field, delta]: [string, any]) => (
                              <div key={field} className="text-[11px] text-slate-600 font-mono">
                                <span className="font-bold text-[#13789B]">{field}:</span>{" "}
                                <span className="text-rose-600 line-through">{String(delta.old ?? "none")}</span>{" "}
                                → <span className="text-emerald-700 font-bold">{String(delta.new ?? "none")}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {isCurrentAdmin ? (
              <span className="font-semibold text-purple-700">★ You are logged in as this administrator</span>
            ) : (
              <span>Registered in Swarnim Enterprise ERP</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-200 hover:bg-slate-300 px-5 py-2 text-xs font-bold text-slate-700 transition"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
