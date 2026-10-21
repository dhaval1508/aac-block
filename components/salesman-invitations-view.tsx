"use client";

import { useState } from "react";
import {
  Send,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  User,
  ExternalLink,
  AlertCircle,
  Share2,
  RefreshCw,
} from "lucide-react";
import {
  createCustomerInvitationAction,
  revokeInvitationAction,
} from "@/lib/actions/salesmen";
import { formatDate } from "@/lib/utils";
import {
  buildCustomerInvitationWhatsAppMessage,
  getWhatsAppShareUrl,
} from "@/lib/whatsapp";

export interface InvitationItem {
  id: string;
  customerName: string;
  mobile: string;
  token: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: Date | string;
  acceptedAt: Date | string | null;
  createdAt: Date | string;
}

interface SalesmanInvitationsViewProps {
  salesmanName: string;
  invitations: InvitationItem[];
  currentToken?: string;
  appBaseUrl: string;
  error?: string;
  success?: string;
}

export function SalesmanInvitationsView({
  salesmanName,
  invitations,
  currentToken,
  appBaseUrl,
  error,
  success,
}: SalesmanInvitationsViewProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const getInviteUrl = (token: string) => {
    const base = appBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/invite/${token}`;
  };

  const handleCopy = (token: string) => {
    const url = getInviteUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const activeTokenInvitation = currentToken
    ? invitations.find((i) => i.token === currentToken)
    : invitations.find((i) => i.status === "PENDING");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-navy">Customer WhatsApp Invitations</h1>
        <p className="mt-1 text-xs text-slate-500">
          Generate secure registration invitations for your customers and share prefilled WhatsApp messages.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Generator Form (1 col) */}
        <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-navy">Invite Customer</h2>
              <p className="text-[11px] text-slate-400">Generate secure unique link</p>
            </div>
          </div>

          <form action={createCustomerInvitationAction} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  name="customerName"
                  required
                  placeholder="e.g. Ramesh Patel"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Mobile Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  name="mobile"
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>Generate Invitation Token</span>
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700">Security Guarantee:</span> Cryptographically secure token valid for 7 days. Once the customer completes registration, the token is permanently consumed and bound to your account.
          </div>
        </div>

        {/* Right Column: Active Ready Invitation Card & WhatsApp Message Preview (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {activeTokenInvitation ? (
            <div className="card rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/80">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-200/60 rounded-md px-2 py-0.5">
                    Ready to Send via WhatsApp
                  </span>
                  <h3 className="mt-1 text-base font-black text-navy">
                    Invitation for {activeTokenInvitation.customerName} ({activeTokenInvitation.mobile})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(activeTokenInvitation.token)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100/50 transition cursor-pointer shadow-xs"
                  >
                    {copiedToken === activeTokenInvitation.token ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={getWhatsAppShareUrl(
                      activeTokenInvitation.mobile,
                      buildCustomerInvitationWhatsAppMessage(
                        activeTokenInvitation.customerName,
                        salesmanName,
                        getInviteUrl(activeTokenInvitation.token)
                      )
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send via WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Invitation Link Input Box */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Unique Secure Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={getInviteUrl(activeTokenInvitation.token)}
                    className="w-full rounded-xl border border-emerald-300 bg-white py-2 px-3 text-xs font-mono text-emerald-900 select-all outline-none"
                  />
                </div>
              </div>

              {/* Prefilled WhatsApp Message Box */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Prefilled WhatsApp Message (Exact Prompt Template)
                </label>
                <div className="rounded-2xl bg-white border border-emerald-200 p-3.5 text-xs text-slate-700 font-sans whitespace-pre-line shadow-xs">
                  {buildCustomerInvitationWhatsAppMessage(
                    activeTokenInvitation.customerName,
                    salesmanName,
                    getInviteUrl(activeTokenInvitation.token)
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card rounded-3xl bg-white border border-slate-200 p-6 shadow-xs text-center py-10">
              <Send className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Active Invitation Selected</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Enter a customer&apos;s name and mobile number on the left to generate their prefilled WhatsApp invitation.
              </p>
            </div>
          )}

          {/* Invitation History Table */}
          <div className="card rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-navy">
                Invitation History ({invitations.length})
              </h3>
            </div>

            {invitations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No previous invitations generated.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Generated</th>
                      <th className="py-3 px-4">Expires</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((inv) => {
                      const isExpired = new Date() > new Date(inv.expiresAt) && inv.status === "PENDING";
                      const effectiveStatus = isExpired ? "EXPIRED" : inv.status;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-navy block">{inv.customerName}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{inv.mobile}</span>
                          </td>

                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {formatDate(inv.createdAt)}
                          </td>

                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {formatDate(inv.expiresAt)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {effectiveStatus === "ACCEPTED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Accepted
                              </span>
                            ) : effectiveStatus === "PENDING" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                <Clock className="h-3 w-3" />
                                Pending
                              </span>
                            ) : effectiveStatus === "EXPIRED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                Expired
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                                Revoked
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {effectiveStatus === "PENDING" && (
                                <>
                                  <button
                                    onClick={() => handleCopy(inv.token)}
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
                                    title="Copy Link"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>

                                  <a
                                    href={getWhatsAppShareUrl(
                                      inv.mobile,
                                      buildCustomerInvitationWhatsAppMessage(
                                        inv.customerName,
                                        salesmanName,
                                        getInviteUrl(inv.token)
                                      )
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 p-1.5 hover:bg-emerald-100"
                                    title="Send WhatsApp"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                  </a>

                                  <form action={revokeInvitationAction}>
                                    <input type="hidden" name="invitationId" value={inv.id} />
                                    <button
                                      type="submit"
                                      className="rounded-lg border border-rose-200 text-rose-600 p-1.5 hover:bg-rose-50"
                                      title="Revoke Invitation"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                    </button>
                                  </form>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
