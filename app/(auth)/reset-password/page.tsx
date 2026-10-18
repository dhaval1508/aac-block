import Link from "next/link";
import { Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; verified?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-900 px-3 py-6 sm:px-4 sm:py-8 min-w-0 max-w-full">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-8 shadow-2xl min-w-0">
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="mb-3 flex items-center justify-center rounded-2xl bg-white p-3 border border-slate-100 shadow-sm">
            <Logo size="lg" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            Set New Password
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Enter a secure new password for <strong>{params.email || "your account"}</strong>.
          </p>
        </div>

        {params.error ? (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            {params.error}
          </div>
        ) : null}

        <form action={resetPasswordAction} className="space-y-4">
          <input type="hidden" name="email" value={params.email ?? ""} />

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              New Password (Min 6 chars)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                name="newPassword"
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3.5 text-sm outline-none focus:border-swarnim focus:bg-white focus:ring-2 focus:ring-swarnim/20"
              />
            </div>
          </div>

          <button
            type="submit"
            style={{ backgroundColor: "#1e72a8", color: "#ffffff" }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e72a8] px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-[#1e72a8]/30 transition hover:bg-[#165f8d] active:scale-[0.99] cursor-pointer"
          >
            <span className="text-white font-bold">Update Password</span>
            <ArrowRight className="h-4 w-4 text-white" />
          </button>

          <div className="pt-2 text-center border-t border-slate-100">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
