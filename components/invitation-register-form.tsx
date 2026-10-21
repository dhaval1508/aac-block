"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Lock, Building, MapPin, ArrowRight, Loader2, AlertCircle, CheckCircle2, UserCheck } from "lucide-react";
import { registerCustomerFromInvitationAction } from "@/lib/actions/salesmen";

interface InvitationRegisterFormProps {
  token: string;
  customerName: string;
  mobile: string;
  salesmanName: string;
  error?: string;
}

export function InvitationRegisterForm({
  token,
  customerName,
  mobile,
  salesmanName,
  error,
}: InvitationRegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState(error ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    setLocalError("");
    startTransition(async () => {
      await registerCustomerFromInvitationAction(formData);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      {localError ? (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{localError}</span>
        </div>
      ) : null}

      <input type="hidden" name="token" value={token} />

      {/* Verified Salesman & Customer Card */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200/80 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Verified Invitation
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800">
              Assigned Salesman: <span className="text-emerald-700 font-bold">{salesmanName}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-600">
              Customer: <span className="font-semibold text-slate-800">{customerName}</span> ({mobile})
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 pb-2 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-swarnim">
          1. Set Your Secure Password
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Set Password (Min 6 chars) *</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Confirm Password *</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 pb-2 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-swarnim">
          2. Delivery & Business Details (Optional)
        </h3>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Company / Site Name (Optional)</label>
        <div className="relative">
          <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            name="companyName"
            placeholder="e.g. Swarnim Heights Site"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Delivery Site Address</label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <textarea
            name="address"
            rows={2}
            placeholder="Plot / Survey No, Road, Area, Landmark"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">City / Town</label>
          <input
            name="city"
            placeholder="e.g. Surat / Ahmedabad"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Pincode</label>
          <input
            name="pincode"
            pattern="[0-9]{6}"
            placeholder="6-digit pincode"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-swarnim to-amber-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-swarnim/25 hover:from-swarnim-dark hover:to-amber-700 disabled:opacity-60 transition"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Activating Your Account...</span>
          </>
        ) : (
          <>
            <span>Complete Registration & Access Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
