import { redirect } from "next/navigation";
import {
  Building2,
  Save,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Phone,
  Award,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { getCompanyProfile } from "@/lib/company-profile";
import { updateCompanyProfileAction } from "@/lib/actions/company-profile";

export const dynamic = "force-dynamic";

export default async function AdminCompanyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { success } = await searchParams;
  const profile = await getCompanyProfile();

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#13789B] text-white">
              <Building2 className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
              Company Profile & Statutory Credentials
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized corporate legal details used across order confirmations, delivery challans, and PDF reports.
          </p>
        </div>
      </div>

      {success === "1" && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-bold">
            Company profile updated successfully! All new documents and challans will reflect these credentials.
          </p>
        </div>
      )}

      {/* Verified GST Registration Certificate Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-[#13789B] p-5 sm:p-6 text-white shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-300" />
            <span className="text-xs font-black uppercase tracking-wider text-teal-300">
              Government of India • GST Registration Certificate
            </span>
          </div>
          <span className="rounded-full bg-teal-400/20 text-teal-200 font-mono text-[10px] font-bold px-2.5 py-0.5 border border-teal-300/30">
            Form GST REG-06
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration Number (GSTIN)</span>
            <strong className="text-base sm:text-lg font-black font-mono text-white tracking-wide block mt-0.5">
              {profile.gstin}
            </strong>
            <span className="text-[10px] text-teal-300 font-medium">State: 24 (Gujarat)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Legal Entity Name</span>
            <strong className="text-sm font-black text-white block mt-0.5">
              {profile.legalName}
            </strong>
            <span className="text-[10px] text-slate-300">Constitution: {profile.constitution}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Validity / Registration</span>
            <strong className="text-sm font-bold text-white block mt-0.5">
              From {profile.registrationDate}
            </strong>
            <span className="text-[10px] text-slate-300">Type: {profile.registrationType}</span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form action={updateCompanyProfileAction} className="space-y-6">
        {/* Statutory & Legal Block */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-navy flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="h-4 w-4 text-[#13789B]" />
            <span>1. Verified Corporate Identity</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Legal Company Name *
              </label>
              <input
                type="text"
                name="legalName"
                required
                defaultValue={profile.legalName}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-navy focus:border-[#13789B] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Trade Name *
              </label>
              <input
                type="text"
                name="tradeName"
                required
                defaultValue={profile.tradeName}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-navy focus:border-[#13789B] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GSTIN Number *
              </label>
              <input
                type="text"
                name="gstin"
                required
                defaultValue={profile.gstin}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono font-black text-navy focus:border-[#13789B] outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Constitution
              </label>
              <input
                type="text"
                name="constitution"
                defaultValue={profile.constitution}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-navy focus:border-[#13789B] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Registered Office & Plant Addresses */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-navy flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#13789B]" />
              <span>2. Corporate Office & Factory / Yard Addresses</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify your registered statutory office and your physical manufacturing plant & yard dispatch locations.
            </p>
          </div>

          {/* Sub-section A: Registered Office Address */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Registered Office (Statutory Headquarters)
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registered Office Address (as on Certificate) *
              </label>
              <textarea
                name="registeredAddress"
                required
                rows={2}
                defaultValue={profile.registeredAddress}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">District</label>
                <input
                  type="text"
                  name="district"
                  defaultValue={profile.district}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  defaultValue={profile.state}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">GST Registration Date</label>
                <input
                  type="text"
                  name="registrationDate"
                  defaultValue={profile.registrationDate}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Registration Type</label>
                <input
                  type="text"
                  name="registrationType"
                  defaultValue={profile.registrationType}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Office Administrative / Branch Address (Optional)
              </label>
              <textarea
                name="officeAddress"
                rows={2}
                defaultValue={profile.officeAddress || ""}
                placeholder="Headquarters or branch office address..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>
          </div>

          {/* Sub-section B: Factory / Plant & Yard Address (Pickup / Origin Location) */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[#13789B] text-[10px] font-black">
                    🏭
                  </span>
                  <span>Factory / Yard Address (Pickup / Dispatch Location)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Authoritative dispatch origin displayed in Order Forms, Order Summaries, Challans, and Driver Delivery instructions.
                </p>
              </div>
              {profile.factoryMapsUrl && (
                <a
                  href={profile.factoryMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#13789B] hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Test Google Maps Location</span>
                </a>
              )}
            </div>

            {/* Warning if Factory Address not configured */}
            {(!profile.factoryAddress || !profile.factoryAddress.trim()) && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Factory / Yard Address Not Yet Configured</strong>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Please enter the physical plant address, city, district, and Google Maps link below. This authoritative record will be shown across order summaries and loading logistics.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Factory / Yard Name *
                </label>
                <input
                  type="text"
                  name="factoryName"
                  required
                  defaultValue={profile.factoryName || "Swarnim AAC Block Manufacturing Plant & Yard"}
                  placeholder="e.g. Swarnim AAC Block Manufacturing Plant & Yard"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-navy focus:border-[#13789B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Plant / Yard Dispatch Contact Number
                </label>
                <input
                  type="text"
                  name="factoryContact"
                  defaultValue={profile.factoryContact || profile.companyMobile || ""}
                  placeholder="+91 9998100167 / Dispatch Officer Mobile"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono font-bold text-navy focus:border-[#13789B] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Factory / Manufacturing Plant Address *
              </label>
              <textarea
                name="factoryAddress"
                required
                rows={2}
                defaultValue={profile.factoryAddress || ""}
                placeholder="Survey No. 166/p2/p2, Near Khakhariya-1, Bhathiji Temple, Chikhload to Fagvel Road, Kapadvanj, Dist. Kheda..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Yard Address / Unloading Staging Area (Optional)
              </label>
              <textarea
                name="yardAddress"
                rows={2}
                defaultValue={profile.yardAddress || ""}
                placeholder="Secondary yard location or specific gate / loading area if distinct from main plant..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-navy focus:border-[#13789B] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">City / Taluka *</label>
                <input
                  type="text"
                  name="factoryCity"
                  required
                  defaultValue={profile.factoryCity || "Kapadvanj"}
                  placeholder="e.g. Kapadvanj"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">District *</label>
                <input
                  type="text"
                  name="factoryDistrict"
                  required
                  defaultValue={profile.factoryDistrict || "Kheda"}
                  placeholder="e.g. Kheda"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">State *</label>
                <input
                  type="text"
                  name="factoryState"
                  required
                  defaultValue={profile.factoryState || "Gujarat"}
                  placeholder="e.g. Gujarat"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Pincode *</label>
                <input
                  type="text"
                  name="factoryPincode"
                  required
                  defaultValue={profile.factoryPincode || "387620"}
                  placeholder="e.g. 387620"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-navy outline-none font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Factory Google Maps Location Link (Clickable URL)
              </label>
              <input
                type="url"
                name="factoryMapsUrl"
                defaultValue={profile.factoryMapsUrl || ""}
                placeholder="https://maps.google.com/?q=..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-navy focus:border-[#13789B] outline-none font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                This link will be clickable as &quot;View Factory Location&quot; in the Order Summary and Driver WhatsApp delivery messages.
              </p>
            </div>
          </div>
        </div>

        {/* Contacts & Signatory */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-navy flex items-center gap-2 border-b border-slate-100 pb-3">
            <Phone className="h-4 w-4 text-[#13789B]" />
            <span>3. Contact Information & Authorized Signatory</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Company Mobile Number
              </label>
              <input
                type="text"
                name="companyMobile"
                defaultValue={profile.companyMobile || ""}
                placeholder="+91 98795 00000"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Alternate Mobile Number
              </label>
              <input
                type="text"
                name="altMobile"
                defaultValue={profile.altMobile || ""}
                placeholder="+91 98795 11111"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Company Official Email
              </label>
              <input
                type="email"
                name="companyEmail"
                defaultValue={profile.companyEmail || ""}
                placeholder="info@swarnimaac.com"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Official Website
              </label>
              <input
                type="text"
                name="website"
                defaultValue={profile.website || ""}
                placeholder="https://swarnimaac.com"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                name="contactPerson"
                defaultValue={profile.contactPerson || ""}
                placeholder="Key Manager / Dispatch Head"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Authorized Signatory Name
              </label>
              <input
                type="text"
                name="signatoryName"
                defaultValue={profile.signatoryName || "Authorized Signatory"}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0f607d] py-3.5 px-8 text-sm font-black text-white shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>SAVE COMPANY PROFILE</span>
          </button>
        </div>
      </form>
    </div>
  );
}
