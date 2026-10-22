"use client";

import { useState } from "react";
import {
  UserPlus,
  X,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Shield,
  Building2,
  Users,
  Boxes,
} from "lucide-react";
import { createUserAction } from "@/lib/actions/users";

interface AddStaffModalProps {
  onClose: () => void;
  salesmen?: Array<{ id: string; name: string; salesmanCode?: string | null }>;
  defaultRole?: "STAFF" | "SALESMAN" | "CUSTOMER" | "ADMIN";
}

export function AddStaffModal({ onClose, salesmen = [], defaultRole = "STAFF" }: AddStaffModalProps) {
  const [role, setRole] = useState<string>(defaultRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#13789B]/10 text-[#13789B]">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900 truncate">
                {role === "SALESMAN"
                  ? "Add New Salesman Account"
                  : role === "CUSTOMER"
                  ? "Add Customer / Builder Account"
                  : role === "ADMIN"
                  ? "Add Super Admin Account"
                  : "Add Loading & Stock Staff Account"}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Provision authenticated role-based credentials.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={createUserAction} className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4">
          {/* Operational Role Selector */}
          <div>
            <label className="label">Select Account Role *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  value: "STAFF",
                  title: "Loading & Stock Staff",
                  desc: "Yard Loading & Inventory",
                  icon: Boxes,
                  color: "text-amber-600",
                },
                {
                  value: "SALESMAN",
                  title: "Salesman",
                  desc: "Clients, Orders & WhatsApp",
                  icon: Users,
                  color: "text-blue-600",
                },
                {
                  value: "CUSTOMER",
                  title: "Customer / Builder",
                  desc: "CBM Orders & Delivery Tracking",
                  icon: Building2,
                  color: "text-emerald-600",
                },
                {
                  value: "ADMIN",
                  title: "Super Admin",
                  desc: "Full Factory Administration",
                  icon: Shield,
                  color: "text-purple-600",
                },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                    role === r.value
                      ? "border-[#13789B] bg-[#13789B]/5 ring-1 ring-[#13789B]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <r.icon className={`h-3.5 w-3.5 ${r.color}`} />
                    <span className="block text-xs font-black text-slate-900">{r.title}</span>
                  </div>
                  <span className="block text-[10px] text-slate-500 mt-0.5 leading-tight">{r.desc}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="role" value={role} />
          </div>

          <div>
            <label className="label">Full Name *</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                name="name"
                required
                placeholder={role === "SALESMAN" ? "e.g. Salesman 1" : "e.g. Ramesh Parmar"}
                className="field pl-10 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Mobile Number *</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  name="mobile"
                  type="tel"
                  required
                  placeholder="10-digit mobile"
                  className="field pl-10 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="label">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder={
                    role === "SALESMAN"
                      ? "salesman@swarnim.com"
                      : role === "STAFF"
                      ? "staff@swarnim.com"
                      : "user@swarnim.com"
                  }
                  className="field pl-10 text-xs"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Account Password (Min 6 characters) *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="field pl-10 text-xs"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Passwords are cryptographically hashed using bcrypt.
            </p>
          </div>

          {/* Role-specific fields */}
          {role === "SALESMAN" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="label">Territory / Address</label>
                <input
                  name="address"
                  placeholder="e.g. Ahmedabad North Zone"
                  className="field text-xs"
                />
              </div>
              <div>
                <label className="label">Remarks / Title</label>
                <input
                  name="remarks"
                  placeholder="e.g. Senior Sales Representative"
                  className="field text-xs"
                />
              </div>
            </div>
          )}

          {role === "CUSTOMER" && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Company / Builder Name</label>
                  <input
                    name="companyName"
                    placeholder="e.g. Kailash Developers"
                    className="field text-xs"
                  />
                </div>
                <div>
                  <label className="label">GSTIN Number</label>
                  <input
                    name="gstin"
                    placeholder="24AAAAA0000A1Z5"
                    className="field text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">City / Destination</label>
                  <input
                    name="city"
                    placeholder="e.g. Surat"
                    className="field text-xs"
                  />
                </div>
                <div>
                  <label className="label">Assign to Salesman</label>
                  <select
                    name="salesmanId"
                    className="field text-xs bg-white"
                  >
                    <option value="">Unassigned (Direct Customer)</option>
                    {salesmen.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.salesmanCode || "Sales"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Default Site / Delivery Address</label>
                <input
                  name="address"
                  placeholder="e.g. Plot 42, GIDC Sachin, Surat"
                  className="field text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
            >
              + Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
