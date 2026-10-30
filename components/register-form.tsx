"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Lock, Mail, Phone, User, Building, MapPin, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { registerCustomerAction } from "@/lib/actions/auth";

export function RegisterForm({ error }: { error?: string }) {
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
      await registerCustomerAction(formData);
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

      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-swarnim">
          1. Contact & Credentials
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name *</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="name"
              required
              placeholder="e.g. Ramesh Patel"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Mobile Number *</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="mobile"
              type="tel"
              required
              pattern="[0-9]{10}"
              placeholder="10-digit mobile number"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Email Address *</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            name="email"
            type="email"
            required
            placeholder="customer@domain.com"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Password (Min 6 chars) *</label>
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 pt-2 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-swarnim">
          2. Company & Tax Details
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Company / Firm Name</label>
          <div className="relative">
            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="companyName"
              placeholder="e.g. Shree Buildcon Pvt Ltd"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">GSTIN (Optional)</label>
          <input
            name="gstin"
            maxLength={15}
            placeholder="24AABCS1234F1Z5"
            className="w-full uppercase rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
      </div>

      <div className="border-b border-slate-100 pt-2 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-swarnim">
          3. Delivery & Site Address
        </h3>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Site / Delivery Address *</label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <textarea
            name="deliveryAddress"
            required
            rows={2}
            placeholder="Plot / Site address with landmark for truck unloading"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Billing Address (Optional, if different)</label>
        <textarea
          name="billingAddress"
          rows={1}
          placeholder="Registered office billing address"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">City</label>
          <input
            name="city"
            placeholder="e.g. Vadodara, Surat"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">State</label>
          <input
            name="state"
            defaultValue="Gujarat"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Pincode</label>
          <input
            name="pincode"
            pattern="[0-9]{6}"
            placeholder="380015"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{ backgroundColor: "#1e72a8", color: "#ffffff" }}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e72a8] py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-[#1e72a8]/30 transition hover:bg-[#165f8d] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-white" />
            <span className="text-white font-bold">Creating Customer Account...</span>
          </>
        ) : (
          <>
            <span className="text-white font-bold">Register Customer Account</span>
            <ArrowRight className="h-4 w-4 text-white" />
          </>
        )}
      </button>

      <div className="pt-2 text-center border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-swarnim hover:text-swarnim-600 hover:underline">
            Sign In Here
          </Link>
        </p>
      </div>
    </form>
  );
}
