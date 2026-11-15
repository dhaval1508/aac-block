"use client";

import { useState } from "react";
import {
  Edit,
  X,
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  MapPin,
  Shield,
  Users,
  Boxes,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";
import type { ManagedUser } from "@/components/users-manager";
import { updateUserDetailsAction, type UpdateUserInput } from "@/lib/actions/users";

interface EditUserModalProps {
  user: ManagedUser;
  salesmen: Array<{ id: string; name: string; salesmanCode?: string | null }>;
  currentUserId: string;
  onClose: () => void;
  onSuccess: (updatedUser: ManagedUser, message: string) => void;
}

export function EditUserModal({
  user,
  salesmen,
  currentUserId,
  onClose,
  onSuccess,
}: EditUserModalProps) {
  const isCurrentAdmin = user.id === currentUserId;

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.mobile);
  const [role, setRole] = useState<ManagedUser["role"]>(user.role);
  const [active, setActive] = useState<boolean>(user.active);
  const [companyName, setCompanyName] = useState(user.companyName || "");
  const [gstin, setGstin] = useState(user.gstin || "");
  const [billingAddress, setBillingAddress] = useState(user.billingAddress || "");
  const [deliveryAddress, setDeliveryAddress] = useState(user.deliveryAddress || "");
  const [city, setCity] = useState(user.city || "");
  const [state, setState] = useState(user.state || "Gujarat");
  const [pincode, setPincode] = useState(user.pincode || "");
  const [salesmanId, setSalesmanId] = useState(user.salesmanId || "");
  const [salesmanCode, setSalesmanCode] = useState(user.salesmanCode || "");
  const [remarks, setRemarks] = useState(user.remarks || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Full Name is required.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("A valid Email Address is required.");
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      setError("Please enter a valid 10-digit Mobile Number.");
      return;
    }

    if (isCurrentAdmin && !active) {
      setError("You cannot disable your own active Super Admin account.");
      return;
    }

    setIsPending(true);

    try {
      const input: UpdateUserInput = {
        id: user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: cleanMobile,
        role,
        active,
        companyName: companyName.trim() || null,
        gstin: gstin.trim().toUpperCase() || null,
        billingAddress: billingAddress.trim() || null,
        deliveryAddress: deliveryAddress.trim() || null,
        city: city.trim() || null,
        state: state.trim() || "Gujarat",
        pincode: pincode.trim() || null,
        remarks: remarks.trim() || null,
        salesmanId: role === "CUSTOMER" ? (salesmanId || null) : null,
        salesmanCode: role === "SALESMAN" ? (salesmanCode.trim() || null) : null,
        avatarUrl: avatarUrl.trim() || null,
      };

      const res = await updateUserDetailsAction(input);

      if (res.success && res.user) {
        onSuccess(res.user as unknown as ManagedUser, `Profile details for "${name}" updated successfully.`);
        onClose();
      } else {
        setError(res.error || "Failed to update profile details.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while saving profile changes.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#13789B]/10 text-[#13789B] border border-[#13789B]/20">
              <Edit className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900 truncate">Edit User Profile</h2>
              <p className="text-xs text-slate-500 truncate">
                Update account details, role permissions, and company records.
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

        {/* Error Alert */}
        {error && (
          <div className="mx-5 sm:mx-6 mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Section: Primary Identity */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              1. Primary Identity & Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Ramesh Patel"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@company.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    placeholder="9876543210"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Profile Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                />
              </div>
            </div>
          </div>

          {/* Section: Role & Account Status */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              2. System Role & Access Permissions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Assigned Operational Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as ManagedUser["role"])}
                  disabled={isCurrentAdmin}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs sm:text-sm font-bold text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20 disabled:opacity-50"
                >
                  <option value="ADMIN">Super Admin (Full Enterprise Access)</option>
                  <option value="SALESMAN">Sales Representative</option>
                  <option value="CUSTOMER">Client / Builder</option>
                  <option value="STAFF">Loading & Yard Staff</option>
                  <option value="STOCKER">Stock & Inventory Manager</option>
                </select>
                {isCurrentAdmin && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Self-role modification is disabled to protect administrative control.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Account Login Status
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isCurrentAdmin}
                    onClick={() => setActive(true)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-2.5 px-3 text-xs font-bold transition border cursor-pointer ${
                      active
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Active (Allowed)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isCurrentAdmin}
                    onClick={() => setActive(false)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-2.5 px-3 text-xs font-bold transition border cursor-pointer ${
                      !active
                        ? "bg-rose-50 text-rose-800 border-rose-300 shadow-xs"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span>Disabled (Blocked)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Role Specific Context */}
          {role === "CUSTOMER" && (
            <div className="pt-2 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                3. Customer Organization & Salesman Assignment
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Assigned Sales Representative
                  </label>
                  <select
                    value={salesmanId}
                    onChange={(e) => setSalesmanId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                  >
                    <option value="">— Direct Client (No Salesman Assigned) —</option>
                    {salesmen.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.salesmanCode ? `(${s.salesmanCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Company / Firm Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Swastik Constructions"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="24ABCDE1234F1Z5"
                    maxLength={15}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                  />
                </div>
              </div>
            </div>
          )}

          {role === "SALESMAN" && (
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                3. Salesman Identification
              </h3>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Salesman Reference Code
                </label>
                <input
                  type="text"
                  value={salesmanCode}
                  onChange={(e) => setSalesmanCode(e.target.value)}
                  placeholder="e.g. SAB-SALES-001"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                />
              </div>
            </div>
          )}

          {/* Section: Location & Addresses */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              4. Addresses & Location Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Delivery Site Address
                </label>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Primary unloading destination..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Official Billing Address
                </label>
                <textarea
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Registered commercial address..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Vadodara"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Gujarat"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="390001"
                  maxLength={6}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs sm:text-sm font-mono text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Internal Remarks / Notes
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional operational note..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#13789B] focus:bg-white focus:ring-2 focus:ring-[#13789B]/20"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#13789B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0f607d] transition disabled:opacity-50 cursor-pointer shadow-md shadow-[#13789B]/20"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Profile Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
