import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { InvitationRegisterForm } from "@/components/invitation-register-form";
import { AlertCircle, Clock, CheckCircle2, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const invitation = await prisma.customerInvitation.findUnique({
    where: { token },
    include: { salesman: true },
  });

  const now = new Date();
  const isExpired = invitation ? now > invitation.expiresAt || invitation.status === "EXPIRED" : false;
  const isAccepted = invitation?.status === "ACCEPTED";
  const isRevoked = invitation?.status === "REVOKED";
  const isValid = invitation && invitation.status === "PENDING" && !isExpired;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-900 px-3 py-6 sm:px-4 sm:py-8 min-w-0 max-w-full">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 sm:p-8 shadow-2xl min-w-0">
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="mb-3 flex items-center justify-center rounded-2xl bg-white p-3 border border-slate-100 shadow-sm">
            <Logo size="lg" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            Customer Invitation
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Swarnim AAC Block Private Limited • Direct Salesman Invitation
          </p>
        </div>

        {!invitation ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Invalid Invitation Link</h2>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              This invitation link could not be found or has been removed. Please contact your assigned salesman to obtain a valid invitation.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Go to Existing Account Login
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : isAccepted ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Invitation Already Accepted</h2>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              This invitation has already been successfully activated. You can sign in using your mobile number and password.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-swarnim px-5 py-2.5 text-xs font-bold text-white hover:bg-swarnim-dark shadow-md shadow-swarnim/25"
              >
                Sign In to Customer Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : isExpired || isRevoked ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {isRevoked ? "Invitation Link Revoked" : "Invitation Link Expired"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              {isRevoked
                ? "This invitation has been revoked by your assigned salesman."
                : "This invitation link was valid for 7 days and has expired."}{" "}
              Please contact your salesman ({invitation.salesman?.name || "Swarnim Staff"}) to generate a new WhatsApp invitation link.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Go to Login
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : isValid ? (
          <InvitationRegisterForm
            token={token}
            customerName={invitation.customerName}
            mobile={invitation.mobile}
            salesmanName={invitation.salesman?.name || "Swarnim Salesman"}
            error={error}
          />
        ) : null}
      </div>
    </div>
  );
}
