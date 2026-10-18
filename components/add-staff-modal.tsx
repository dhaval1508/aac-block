"use client";

import { useState } from "react";
import { UserPlus, X, Shield, Lock, Mail, Phone, User as UserIcon } from "lucide-react";
import { createUserAction } from "@/lib/actions/users";

export function AddStaffModal({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState("STAFF");

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
              <h2 className="text-base font-black text-slate-900 truncate">Add Factory Staff Account</h2>
              <p className="text-xs text-slate-500 truncate">
                Provision authenticated login credentials.
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
          <div>
            <label className="label">Full Name *</label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                name="name"
                required
                placeholder="e.g. Ramesh Parmar"
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
                  placeholder="staff@swarnimdemo.com"
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
                placeholder="••••••••"
                className="field pl-10 text-xs"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Staff will use this password alongside their registered email to sign in.
            </p>
          </div>

          <div>
            <label className="label">Operational Role *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: "STAFF", title: "Loading Staff", desc: "Yard Mobile Tasks" },
                { value: "STOCKER", title: "Stocker", desc: "Stock In/Out & Catalog" },
                { value: "ADMIN", title: "Super Admin", desc: "Full Factory ERP" },
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
                  <span className="block text-xs font-black text-slate-900">{r.title}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5 leading-tight">{r.desc}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="role" value={role} />
          </div>

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
              + Create Team Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
