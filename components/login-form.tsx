"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm({
  error,
  next,
}: {
  error?: string;
  next?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localError, setLocalError] = useState(error ?? "");

  const handleSubmit = (formData: FormData) => {
    setLocalError("");
    startTransition(async () => {
      await loginAction(formData);
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

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-swarnim hover:text-swarnim-600 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{ backgroundColor: "#1e72a8", color: "#ffffff" }}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e72a8] px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-[#1e72a8]/30 transition hover:bg-[#165f8d] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-white" />
            <span className="text-white font-bold">Verifying Credentials...</span>
          </>
        ) : (
          <>
            <span className="text-white font-bold">Sign In</span>
            <ArrowRight className="h-4 w-4 text-white" />
          </>
        )}
      </button>

      <div className="pt-2 text-center border-t border-slate-100">
        <p className="text-xs text-slate-500">
          New Construction Client?{" "}
          <Link
            href="/register"
            className="font-bold text-swarnim hover:text-swarnim-600 hover:underline"
          >
            Register as Customer
          </Link>
        </p>
      </div>
    </form>
  );
}
