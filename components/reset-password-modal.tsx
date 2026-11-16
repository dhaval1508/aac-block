"use client";

import { useState } from "react";
import { KeyRound, X, Eye, EyeOff, Copy, Check, ShieldAlert, Loader2 } from "lucide-react";
import { resetUserPasswordAction } from "@/lib/actions/users";

interface ResetPasswordModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    role: string;
  };
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function ResetPasswordModal({ user, onClose, onSuccess }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    let generated = "Swarnim@";
    for (let i = 0; i < 4; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const res = await resetUserPasswordAction(user.id, password);
      if (res.success) {
        onSuccess(`Password for ${user.name} was successfully reset.`);
        onClose();
      } else {
        setError(res.error || "Failed to reset password.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 scale-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Reset User Password</h3>
              <p className="text-xs text-slate-500 font-medium">
                {user.name} ({user.email})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                New Password <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-xs font-bold text-[#13789B] hover:underline"
              >
                Generate Strong
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                required
                minLength={6}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-20 text-sm font-mono text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {password && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    title="Copy password"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              The user can use this new password immediately to log into their workspace.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-700">Security Note:</p>
            <p>
              This password will be securely salted and hashed before storing in the database. Password hashes are never exposed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || password.length < 6}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#13789B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0f607d] transition disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save & Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

