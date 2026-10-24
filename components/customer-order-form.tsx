"use client";

import { useMemo, useState } from "react";
import { formatNumber, formatBlockSizeName } from "@/lib/utils";
import { placeCustomerOrderAction, editCustomerOrderAction } from "@/lib/actions/orders";
import {
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Sparkles,
  Info,
  ShieldCheck,
  MapPin,
  User,
  UserPlus,
  Phone,
  Mail,
  FileText,
  X,
  ArrowLeft,
  Boxes,
  ExternalLink,
  Search,
  Building2,
  Check,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import {
  DeliveryLocationPicker,
  DeliveryLocationData,
} from "@/components/delivery-location-picker";

export type ProductItem = {
  id: string;
  name: string;
  category: string;
  brand: string;
  sizeLabel: string;
  dimensions: string;
  cbmPerBlock: number;
  blocksPerCbm: number;
  price: number;
  gstRate: number;
  bagWeightKg?: number | null;
  coverageSqft?: number | null;
};

export interface CustomerDefaults {
  name: string;
  mobile: string;
  email: string;
  deliveryAddress: string;
  city: string;
  pincode: string;
  gstin?: string;
  companyName?: string;
}

export interface AssignedCustomerOption {
  id: string;
  name: string;
  companyName?: string | null;
  mobile: string;
  email?: string | null;
  deliveryAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
}

export interface BlockOrderItem {
  id: string;
  productId: string;
  cbm: number | "";
  quantity: number | "";
  pricePerCbm?: number | "";
}

export function CustomerOrderForm({
  aacProducts,
  adhesiveProduct,
  customerDefaults,
  defaultProductId,
  defaultQuantity,
  defaultAdhesiveBags = 0,
  isEditing = false,
  orderId,
  orderNo,
  initialBlockItems,
  initialDeliveryLocation,
  initialNotes = "",
  error,
  isSalesmanMode = false,
  assignedCustomers = [],
  salesmanName,
  selectedCustomerId,
  initialGstBillingSelected,
  initialGstNumber,
  initialGstRegisteredName,
  initialGstStatus,
  initialPricePerCbm,
  initialPricingRemarks,
}: {
  aacProducts: ProductItem[];
  adhesiveProduct?: ProductItem | null;
  customerDefaults: CustomerDefaults;
  defaultProductId?: string;
  defaultQuantity?: number;
  defaultAdhesiveBags?: number;
  isEditing?: boolean;
  orderId?: string;
  orderNo?: string;
  initialBlockItems?: BlockOrderItem[];
  initialDeliveryLocation?: DeliveryLocationData;
  initialNotes?: string;
  error?: string;
  isSalesmanMode?: boolean;
  assignedCustomers?: AssignedCustomerOption[];
  salesmanName?: string;
  selectedCustomerId?: string;
  initialGstBillingSelected?: boolean;
  initialGstNumber?: string;
  initialGstRegisteredName?: string;
  initialGstStatus?: string;
  initialPricePerCbm?: number | string | null;
  initialPricingRemarks?: string | null;
}) {
  const initialAacId =
    defaultProductId && aacProducts.some((p) => p.id === defaultProductId)
      ? defaultProductId
      : aacProducts.find((p) => p.sizeLabel?.includes("6"))?.id || aacProducts[0]?.id || "";
  const initialProd = aacProducts.find((p) => p.id === initialAacId) || aacProducts[0];
  const initialRate = initialProd ? Number(initialProd.cbmPerBlock) || 0.018 : 0.018;
  const initialQty = defaultQuantity || 1000;
  const initialCbm = Number((initialQty * initialRate).toFixed(3));

  // Salesman Customer Selection State
  const initialCustId =
    selectedCustomerId ||
    (assignedCustomers.length > 0 ? assignedCustomers[0].id : "");
  const initialAssigned = assignedCustomers.find((c) => c.id === initialCustId);

  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [activeCustomerId, setActiveCustomerId] = useState<string>(initialCustId);
  const [customerSearch, setCustomerSearch] = useState("");

  // Inline New Customer Form Fields
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerCompanyName, setNewCustomerCompanyName] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerCity, setNewCustomerCity] = useState("Ahmedabad");
  const [newCustomerState, setNewCustomerState] = useState("Gujarat");
  const [newCustomerPincode, setNewCustomerPincode] = useState("");

  // Section A: Multiple AAC block sizes (CBM is primary)
  const [blockItems, setBlockItems] = useState<BlockOrderItem[]>(
    initialBlockItems && initialBlockItems.length > 0
      ? initialBlockItems
      : [
          {
            id: "initial-1",
            productId: initialAacId,
            cbm: initialCbm,
            quantity: initialQty,
          },
        ]
  );

  // Section B: Block Jointing Morter (40 KG Bag only, default 0, compulsory field)
  const [adhesiveBags, setAdhesiveBags] = useState<number | "">(defaultAdhesiveBags);

  // Section C: Customer Details
  const [customerName, setCustomerName] = useState(
    isSalesmanMode && initialAssigned
      ? initialAssigned.companyName || initialAssigned.name
      : customerDefaults.name
  );
  const [customerMobile, setCustomerMobile] = useState(
    isSalesmanMode && initialAssigned ? initialAssigned.mobile : customerDefaults.mobile
  );
  const [customerEmail, setCustomerEmail] = useState(
    isSalesmanMode && initialAssigned ? initialAssigned.email || "" : customerDefaults.email
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialDeliveryLocation?.address ||
      (isSalesmanMode && initialAssigned ? initialAssigned.deliveryAddress || "" : customerDefaults.deliveryAddress)
  );
  const [city, setCity] = useState(
    initialDeliveryLocation?.city ||
      (isSalesmanMode && initialAssigned ? initialAssigned.city || "Ahmedabad" : customerDefaults.city || "Ahmedabad")
  );
  const [pincode, setPincode] = useState(
    initialDeliveryLocation?.pincode ||
      (isSalesmanMode && initialAssigned ? initialAssigned.pincode || "" : customerDefaults.pincode || "")
  );
  const [requestedDate, setRequestedDate] = useState("");
  const [notes, setNotes] = useState(initialNotes);

  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocationData>(
    initialDeliveryLocation || {
      address: isSalesmanMode && initialAssigned ? initialAssigned.deliveryAddress || "" : customerDefaults.deliveryAddress || "",
      locationSource: "MANUAL",
      city: isSalesmanMode && initialAssigned ? initialAssigned.city || "Ahmedabad" : customerDefaults.city || "Ahmedabad",
      pincode: isSalesmanMode && initialAssigned ? initialAssigned.pincode || "" : customerDefaults.pincode || "",
      state: isSalesmanMode && initialAssigned ? initialAssigned.state || "Gujarat" : "Gujarat",
    }
  );

  // Section: Order Price & Remarks State
  const [pricePerCbm, setPricePerCbm] = useState<number | "">(
    initialPricePerCbm !== undefined && initialPricePerCbm !== null && initialPricePerCbm !== ""
      ? Number(initialPricePerCbm)
      : ""
  );
  const [pricingRemarks, setPricingRemarks] = useState<string>(
    initialPricingRemarks || ""
  );

  // Section: GST Billing Option State - Default to Without-GST commercial bill so orders are never blocked
  const [gstBillingSelected, setGstBillingSelected] = useState<boolean>(
    initialGstBillingSelected === true
  );
  const [gstNumber, setGstNumber] = useState<string>(
    initialGstNumber || (initialAssigned?.gstin && initialAssigned.gstin.length === 15 ? initialAssigned.gstin : "")
  );
  const [gstRegisteredName, setGstRegisteredName] = useState<string>(
    initialGstRegisteredName ||
      (initialAssigned?.gstin
        ? initialAssigned.companyName || initialAssigned.name
        : customerDefaults.gstin
        ? customerDefaults.companyName || customerDefaults.name
        : "")
  );
  const [gstTradeName, setGstTradeName] = useState<string>("");
  const [gstStatus, setGstStatus] = useState<string>(initialGstStatus || "Active");
  const [gstState, setGstState] = useState<string>("");
  const [isVerifyingGst, setIsVerifyingGst] = useState<boolean>(false);
  const [gstError, setGstError] = useState<string>("");
  const [gstVerified, setGstVerified] = useState<boolean>(
    Boolean(initialGstRegisteredName && initialGstNumber && initialGstNumber.length === 15)
  );

  const handleVerifyGst = async (overrideNumber?: string): Promise<boolean> => {
    const raw = (overrideNumber !== undefined ? overrideNumber : gstNumber).trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (!raw) {
      setGstError("GST Number is required when GST Billing is selected.");
      setGstVerified(false);
      setGstRegisteredName("");
      return false;
    }

    setIsVerifyingGst(true);
    setGstError("");

    try {
      const res = await fetch("/api/gst/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: raw }),
      });
      const data = await res.json();
      if (data.valid) {
        setGstNumber(data.gstin);
        setGstRegisteredName(data.registeredName || data.legalName || "GST Registered Entity");
        setGstTradeName(data.tradeName || "");
        setGstStatus(data.gstStatus || "Active");
        setGstState(data.state || "");
        setGstVerified(true);
        setGstError("");
        return true;
      } else {
        setGstVerified(false);
        setGstRegisteredName("");
        setGstError(data.error || "Invalid GST Number format. Please enter a valid 15-character GSTIN.");
        return false;
      }
    } catch {
      setGstError("Unable to verify GST number right now. Please check network connection.");
      setGstVerified(false);
      return false;
    } finally {
      setIsVerifyingGst(false);
    }
  };

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handler for picking an assigned customer
  const handleSelectAssignedCustomer = (cust: AssignedCustomerOption) => {
    setActiveCustomerId(cust.id);
    const chosenName = cust.companyName || cust.name;
    setCustomerName(chosenName);
    setCustomerMobile(cust.mobile);
    setCustomerEmail(cust.email || "");
    setDeliveryAddress(cust.deliveryAddress || "");
    setCity(cust.city || "Ahmedabad");
    setPincode(cust.pincode || "");
    if (cust.gstin && cust.gstin.trim().length === 15) {
      setGstNumber(cust.gstin.trim().toUpperCase());
      setGstRegisteredName(cust.companyName || cust.name);
      setGstError("");
    }
    setDeliveryLocation((prev) => ({
      ...prev,
      address: cust.deliveryAddress || "",
      city: cust.city || "Ahmedabad",
      pincode: cust.pincode || "",
      state: cust.state || "Gujarat",
    }));
  };

  // Handler for switching customer mode
  const handleToggleCustomerMode = (toNew: boolean) => {
    setIsNewCustomer(toNew);
    if (toNew) {
      setCustomerName(newCustomerCompanyName || newCustomerName || "");
      setCustomerMobile(newCustomerMobile || "");
      setCustomerEmail(newCustomerEmail || "");
      setDeliveryAddress(newCustomerAddress || "");
      setCity(newCustomerCity || "Ahmedabad");
      setPincode(newCustomerPincode || "");
      setDeliveryLocation((prev) => ({
        ...prev,
        address: newCustomerAddress || "",
        city: newCustomerCity || "Ahmedabad",
        pincode: newCustomerPincode || "",
        state: newCustomerState || "Gujarat",
      }));
    } else {
      const existing = assignedCustomers.find((c) => c.id === activeCustomerId) || assignedCustomers[0];
      if (existing) {
        handleSelectAssignedCustomer(existing);
      }
    }
  };

  // Filtered assigned customers list
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return assignedCustomers;
    const term = customerSearch.toLowerCase().trim();
    return assignedCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.companyName && c.companyName.toLowerCase().includes(term)) ||
        c.mobile.includes(term)
    );
  }, [assignedCustomers, customerSearch]);

  const activeCustomerObj = useMemo(
    () => assignedCustomers.find((c) => c.id === activeCustomerId),
    [assignedCustomers, activeCustomerId]
  );

  // Add another block size row
  const addBlockSizeRow = () => {
    // Pick an unused block size if available, or first
    const usedIds = new Set(blockItems.map((b) => b.productId));
    const nextProduct = aacProducts.find((p) => !usedIds.has(p.id)) || aacProducts[0];
    const rate = nextProduct ? Number(nextProduct.cbmPerBlock) : 0.018;
    setBlockItems((prev) => [
      ...prev,
      {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: nextProduct?.id || "",
        cbm: Number((500 * rate).toFixed(3)),
        quantity: 500,
      },
    ]);
  };

  const removeBlockSizeRow = (id: string) => {
    if (blockItems.length <= 1) return;
    setBlockItems((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBlockSizeRow = (id: string, updates: Partial<BlockOrderItem>) => {
    setBlockItems((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  // Calculations for Section A
  const rowCalculations = useMemo(() => {
    return blockItems.map((item) => {
      const prod = aacProducts.find((p) => p.id === item.productId);
      const cbmPerBlock = prod ? Number(prod.cbmPerBlock) : 0.018;
      const cbmVal = typeof item.cbm === "number" ? Math.max(0, item.cbm) : 0;
      let qty = typeof item.quantity === "number" ? Math.max(0, item.quantity) : 0;
      if (cbmVal > 0 && qty === 0 && cbmPerBlock > 0) {
        qty = Math.round(cbmVal / cbmPerBlock);
      }
      const totalCbm = cbmVal > 0 ? cbmVal : Number((qty * cbmPerBlock).toFixed(4));
      // Formula: Blocks * (Length * Height / 1,000,000) * 10.7639104167 = Qty * 1.29166925 sq.ft.
      const totalSqft = qty * 1.29166925;

      return {
        ...item,
        product: prod,
        numericQty: qty,
        cbmPerBlock,
        totalCbm,
        totalSqft,
      };
    });
  }, [blockItems, aacProducts]);

  const totalBlocks = useMemo(
    () => rowCalculations.reduce((sum, r) => sum + r.numericQty, 0),
    [rowCalculations]
  );

  const combinedCbm = useMemo(
    () => rowCalculations.reduce((sum, r) => sum + r.totalCbm, 0),
    [rowCalculations]
  );

  const combinedSqft = useMemo(
    () => rowCalculations.reduce((sum, r) => sum + r.totalSqft, 0),
    [rowCalculations]
  );

  const numAdhesiveBags =
    typeof adhesiveBags === "number" ? Math.max(0, Math.floor(adhesiveBags)) : 0;

  // Material and Pricing Calculations
  const pricingCalculations = useMemo(() => {
    const fallbackRate = typeof pricePerCbm === "number" ? Math.max(0, pricePerCbm) : 0;
    let materialSubtotal = 0;
    const lines = rowCalculations.map((r) => {
      const lineRate =
        typeof r.pricePerCbm === "number" && r.pricePerCbm > 0
          ? r.pricePerCbm
          : fallbackRate;
      const lineAmount =
        r.totalCbm > 0 && lineRate > 0
          ? Number((r.totalCbm * lineRate).toFixed(2))
          : 0;
      materialSubtotal += lineAmount;
      return {
        ...r,
        lineRate,
        lineAmount,
      };
    });

    const isPriceAdded = fallbackRate > 0 || materialSubtotal > 0;
    const gstRate = gstBillingSelected ? 18 : 0;
    const gstAmount =
      isPriceAdded && gstBillingSelected
        ? Number(((materialSubtotal * 18) / 100).toFixed(2))
        : 0;
    const finalTotalAmount = isPriceAdded
      ? Number((materialSubtotal + gstAmount).toFixed(2))
      : 0;

    return {
      lines,
      fallbackRate,
      isPriceAdded,
      materialSubtotal: Number(materialSubtotal.toFixed(2)),
      gstRate,
      gstAmount,
      finalTotalAmount,
    };
  }, [rowCalculations, pricePerCbm, gstBillingSelected]);

  // JSON Items for submission
  const itemsJson = useMemo(() => {
    const list: Array<{ productId: string; quantity: number; cbm?: number; pricePerCbm?: number }> = [];
    for (const r of pricingCalculations.lines) {
      if (r.productId && (r.numericQty > 0 || r.totalCbm > 0)) {
        list.push({
          productId: r.productId,
          quantity: r.numericQty,
          cbm: r.totalCbm > 0 ? r.totalCbm : undefined,
          pricePerCbm: r.lineRate > 0 ? r.lineRate : undefined,
        });
      }
    }
    if (adhesiveProduct && numAdhesiveBags > 0) {
      list.push({ productId: adhesiveProduct.id, quantity: numAdhesiveBags });
    }
    return JSON.stringify(list);
  }, [pricingCalculations.lines, adhesiveProduct, numAdhesiveBags]);

  return (
    <form
      action={isEditing ? editCustomerOrderAction : placeCustomerOrderAction}
      onSubmit={() => setIsSubmitting(true)}
      className="space-y-6 min-w-0 max-w-full"
    >
      {/* Hidden Fields for Action Processing */}
      {isEditing && <input type="hidden" name="orderId" value={orderId || ""} />}
      <input type="hidden" name="itemsJson" value={itemsJson} />
      <input type="hidden" name="pricePerCbm" value={pricePerCbm !== "" ? pricePerCbm : ""} />
      <input type="hidden" name="pricingRemarks" value={pricingRemarks} />
      <input type="hidden" name="adhesiveBags" value={numAdhesiveBags} />
      <input type="hidden" name="customerName" value={customerName} />
      <input type="hidden" name="customerMobile" value={customerMobile} />
      <input type="hidden" name="customerEmail" value={customerEmail} />
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="pincode" value={pincode} />

      {/* GST Billing Option Hidden Fields */}
      <input type="hidden" name="gstBillingSelected" value={gstBillingSelected ? "true" : "false"} />
      <input type="hidden" name="gstBilling" value={gstBillingSelected ? "yes" : "no"} />
      <input type="hidden" name="gstNumber" value={gstBillingSelected ? gstNumber : ""} />
      <input type="hidden" name="gstRegisteredName" value={gstBillingSelected ? gstRegisteredName : ""} />
      <input type="hidden" name="gstTradeName" value={gstBillingSelected ? gstTradeName : ""} />
      <input type="hidden" name="gstStatus" value={gstBillingSelected ? gstStatus : ""} />
      <input type="hidden" name="gstState" value={gstBillingSelected ? gstState : ""} />

      {/* Salesman Mode Hidden Fields */}
      {isSalesmanMode && (
        <>
          <input type="hidden" name="isSalesmanMode" value="true" />
          <input type="hidden" name="isNewCustomer" value={isNewCustomer ? "true" : "false"} />
          <input type="hidden" name="customerId" value={activeCustomerId} />
          {isNewCustomer && (
            <>
              <input type="hidden" name="newCustomerName" value={newCustomerName} />
              <input type="hidden" name="newCustomerMobile" value={newCustomerMobile} />
              <input type="hidden" name="newCustomerEmail" value={newCustomerEmail} />
              <input type="hidden" name="newCustomerCompanyName" value={newCustomerCompanyName} />
              <input type="hidden" name="newCustomerAddress" value={newCustomerAddress} />
              <input type="hidden" name="newCustomerCity" value={newCustomerCity} />
              <input type="hidden" name="newCustomerState" value={newCustomerState} />
              <input type="hidden" name="newCustomerPincode" value={newCustomerPincode} />
            </>
          )}
        </>
      )}

      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* =========================================================================
          SECTION 0: SALESMAN CUSTOMER SELECTION (RENDERED IN SALESMAN MODE)
      ========================================================================= */}
      {isSalesmanMode && (
        <div className="rounded-3xl border-2 border-[#13789B]/30 bg-white p-4 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
                  👤
                </span>
                <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
                  Select Customer
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Place an order on behalf of your assigned Customer, or register a new Customer instantly.
              </p>
            </div>
            {salesmanName && (
              <span className="self-start sm:self-auto rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-[11px] font-bold text-purple-700">
                Logged-in Salesman: {salesmanName}
              </span>
            )}
          </div>

          {/* Mode Tabs: Select Existing vs Add New */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100 p-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleToggleCustomerMode(false)}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 transition-all cursor-pointer ${
                !isNewCustomer
                  ? "bg-white text-navy shadow-xs font-black"
                  : "text-slate-600 hover:text-navy"
              }`}
            >
              <User className="h-4 w-4 text-[#13789B]" />
              <span>Select Assigned Customer ({assignedCustomers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleCustomerMode(true)}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 transition-all cursor-pointer ${
                isNewCustomer
                  ? "bg-[#13789B] text-white shadow-xs font-black"
                  : "text-slate-600 hover:text-navy"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Add New Customer</span>
            </button>
          </div>

          {/* Tab 1: Existing Assigned Customer */}
          {!isNewCustomer ? (
            <div className="space-y-4">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search your assigned customers by name or 10-digit mobile..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs text-navy placeholder:text-slate-400 focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 outline-none"
                />
              </div>

              {/* Customer Select Dropdown / Grid */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Choose Assigned Customer *
                </label>
                {filteredCustomers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                    {assignedCustomers.length === 0
                      ? "You currently have no customers assigned. Click '+ Add New Customer' to add one."
                      : "No assigned customers match your search."}
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                    {filteredCustomers.map((c) => {
                      const isSelected = activeCustomerId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectAssignedCustomer(c)}
                          className={`w-full text-left p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-teal-50/80 border-l-4 border-l-[#13789B]"
                              : "hover:bg-white"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-navy truncate">
                                {c.companyName || c.name}
                              </span>
                              {c.companyName && (
                                <span className="text-[10px] text-slate-500 font-normal">
                                  ({c.name})
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                              <span className="font-mono font-medium">📱 {c.mobile}</span>
                              {c.city && <span>📍 {c.city}</span>}
                              {c.deliveryAddress && (
                                <span className="truncate max-w-[220px]">
                                  • {c.deliveryAddress}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#13789B] text-white shrink-0">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active Customer Information Card */}
              {activeCustomerObj && (
                <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3.5 text-xs text-teal-950 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#13789B] uppercase tracking-wider text-[10px]">
                      Selected Assigned Customer
                    </span>
                    <span className="text-[10px] font-bold bg-white border border-teal-300 text-teal-800 px-2 py-0.5 rounded-full">
                      Assigned to You
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-medium">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Customer Entity:</span>
                      <strong className="text-navy">{activeCustomerObj.companyName || activeCustomerObj.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Mobile:</span>
                      <span className="font-mono text-navy font-bold">{activeCustomerObj.mobile}</span>
                    </div>
                    {activeCustomerObj.deliveryAddress && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 text-[10px] block">Master Profile Delivery Address:</span>
                        <span className="text-slate-700">{activeCustomerObj.deliveryAddress} ({activeCustomerObj.city || "Ahmedabad"})</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-teal-800/90 pt-1 italic border-t border-teal-200/60">
                    ℹ️ You can adjust delivery site address or contact notes below for this specific order without modifying the Customer&apos;s master profile.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Add New Customer Form */
            <div className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-navy">
                <UserPlus className="h-4 w-4 text-[#13789B]" />
                <span>Enter New Customer Details (Will be automatically assigned to you)</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    required={isNewCustomer}
                    value={newCustomerName}
                    onChange={(e) => {
                      setNewCustomerName(e.target.value);
                      if (!newCustomerCompanyName) setCustomerName(e.target.value);
                    }}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-navy outline-none focus:border-[#13789B] focus:ring-1 focus:ring-[#13789B]"
                  />
                </div>

                {/* Mobile Number */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required={isNewCustomer}
                    maxLength={10}
                    value={newCustomerMobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setNewCustomerMobile(val);
                      setCustomerMobile(val);
                    }}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-navy outline-none focus:border-[#13789B] focus:ring-1 focus:ring-[#13789B]"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => {
                      setNewCustomerEmail(e.target.value);
                      setCustomerEmail(e.target.value);
                    }}
                    placeholder="customer@example.com"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-navy outline-none focus:border-[#13789B] focus:ring-1 focus:ring-[#13789B]"
                  />
                </div>

                {/* Company / Site Name */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    Company / Site Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCustomerCompanyName}
                    onChange={(e) => {
                      setNewCustomerCompanyName(e.target.value);
                      setCustomerName(e.target.value || newCustomerName);
                    }}
                    placeholder="e.g. Patel Builders / Site #4"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-navy outline-none focus:border-[#13789B] focus:ring-1 focus:ring-[#13789B]"
                  />
                </div>

                {/* Delivery Site Address */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-bold text-slate-700">
                    Initial Delivery Site Address *
                  </label>
                  <input
                    type="text"
                    required={isNewCustomer}
                    value={newCustomerAddress}
                    onChange={(e) => {
                      setNewCustomerAddress(e.target.value);
                      setDeliveryAddress(e.target.value);
                      setDeliveryLocation((prev) => ({ ...prev, address: e.target.value }));
                    }}
                    placeholder="Plot / Site / Survey No., Landmark, Area"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-navy outline-none focus:border-[#13789B] focus:ring-1 focus:ring-[#13789B]"
                  />
                </div>

                {/* City */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">City / District *</label>
                  <input
                    type="text"
                    required={isNewCustomer}
                    value={newCustomerCity}
                    onChange={(e) => {
                      setNewCustomerCity(e.target.value);
                      setCity(e.target.value);
                      setDeliveryLocation((prev) => ({ ...prev, city: e.target.value }));
                    }}
                    placeholder="Ahmedabad"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-navy outline-none focus:border-[#13789B] focus:ring-1 focus:ring-[#13789B]"
                  />
                </div>

                {/* State & Pincode */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">State *</label>
                    <input
                      type="text"
                      required={isNewCustomer}
                      value={newCustomerState}
                      onChange={(e) => {
                        setNewCustomerState(e.target.value);
                        setDeliveryLocation((prev) => ({ ...prev, state: e.target.value }));
                      }}
                      placeholder="Gujarat"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-navy outline-none focus:border-[#13789B] focus:ring-1 focus:ring-[#13789B]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={newCustomerPincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setNewCustomerPincode(val);
                        setPincode(val);
                        setDeliveryLocation((prev) => ({ ...prev, pincode: val }));
                      }}
                      placeholder="380001"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-navy outline-none focus:border-[#13789B] focus:ring-1 focus:ring-[#13789B]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-3 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-[#13789B] shrink-0 mt-0.5" />
                <p>
                  <strong>Customer Account Creation:</strong> A secure Customer account will be registered and permanently linked to you. If the mobile number already belongs to another Salesman, duplicate protection will prevent reassignment.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          STEP 1: CUSTOMER DETAILS
      ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
            1
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
              Customer Details
            </h2>
            <p className="text-xs text-slate-500">
              Site contact and customer identity for vehicle logistics and invoicing.
            </p>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          {/* Customer Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Customer Name / Company *</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Full name or company entity"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span>Mobile Number *</span>
            </label>
            <input
              type="tel"
              required
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">City / District *</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ahmedabad, Kheda, Surat"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>

          {/* Pincode */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Pincode *</label>
            <input
              type="text"
              required
              value={pincode}
              onChange={(e) => {
                setPincode(e.target.value);
                setDeliveryLocation((prev) => ({ ...prev, pincode: e.target.value }));
              }}
              placeholder="6-digit pincode"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          STEP 2: DELIVERY ADDRESS
      ========================================================================= */}
      <div id="delivery-location-section" className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-7 shadow-xs space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
            2
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
              Delivery Address
            </h2>
            <p className="text-xs text-slate-500">
              Site unloading location and vehicle access details.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Delivery Site Address & Google Maps Location Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#13789B]" />
              <span>Delivery Site Location (Google Maps Search & Custom Entry) *</span>
            </label>
            <DeliveryLocationPicker
              value={deliveryLocation}
              onChange={(newLoc) => {
                setDeliveryLocation(newLoc);
                setDeliveryAddress(newLoc.address);
                if (newLoc.city) setCity(newLoc.city);
                if (newLoc.pincode) setPincode(newLoc.pincode);
              }}
              disabled={isSubmitting}
            />
            {/* Hidden form inputs for server action */}
            <input type="hidden" name="deliveryAddress" value={deliveryAddress} />
            <input type="hidden" name="city" value={city} />
            <input type="hidden" name="pincode" value={pincode} />
            <input type="hidden" name="googleMapsUrl" value={deliveryLocation.googleMapsUrl || ""} />
            <input type="hidden" name="googlePlaceId" value={deliveryLocation.googlePlaceId || ""} />
            <input type="hidden" name="latitude" value={deliveryLocation.latitude ?? ""} />
            <input type="hidden" name="longitude" value={deliveryLocation.longitude ?? ""} />
            <input type="hidden" name="customSiteName" value={deliveryLocation.customSiteName || ""} />
            <input type="hidden" name="villageArea" value={deliveryLocation.villageArea || ""} />
            <input type="hidden" name="district" value={deliveryLocation.district || ""} />
            <input type="hidden" name="state" value={deliveryLocation.state || "Gujarat"} />
            <input type="hidden" name="nearbyLandmark" value={deliveryLocation.nearbyLandmark || ""} />
            <input type="hidden" name="locationSource" value={deliveryLocation.locationSource} />
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>Additional Notes / Unloading Instructions</span>
            </label>
            <input
              type="text"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Crane required / Evening delivery / Gate 2"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          STEP 3: AAC BLOCK SIZE & ORDER QUANTITY
      ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
                3
              </span>
              <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
                AAC Block Details
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select one or multiple standard AAC block sizes and specify required block quantities.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-[11px] font-bold text-[#13789B]">
            All 9 Master BIS Sizes Available
          </span>
        </div>

        {/* Dynamic Block Size Rows */}
        <div className="space-y-3.5">
          {blockItems.map((item, index) => {
            const rowCalc = rowCalculations[index];
            const currentProduct = aacProducts.find((p) => p.id === item.productId);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-5 space-y-3 transition-colors hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Block Size #{index + 1}
                  </span>
                  {blockItems.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeBlockSizeRow(item.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                  {/* Select Block Size */}
                  <div className="sm:col-span-7 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Block Size
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const newProductId = e.target.value;
                        const newProd = aacProducts.find((p) => p.id === newProductId);
                        const newRate = Number(newProd?.cbmPerBlock || 0.018);
                        let newQty = item.quantity;
                        if (typeof item.cbm === "number" && item.cbm > 0 && newRate > 0) {
                          newQty = Math.round(item.cbm / newRate);
                        }
                        updateBlockSizeRow(item.id, {
                          productId: newProductId,
                          quantity: newQty,
                        });
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
                    >
                      {aacProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatBlockSizeName(p.sizeLabel)} ({p.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Enter CBM Quantity (Primary) */}
                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Order Quantity (CBM) *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        required
                        value={item.cbm}
                        onChange={(e) => {
                          const val = e.target.value === "" ? "" : Number(e.target.value);
                          const rate = Number(currentProduct?.cbmPerBlock || 0.018);
                          const calcQty = val !== "" && rate > 0 ? Math.round(Number(val) / rate) : "";
                          updateBlockSizeRow(item.id, {
                            cbm: val,
                            quantity: calcQty,
                          });
                        }}
                        placeholder="e.g. 100.000"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-14 text-xs sm:text-sm font-mono font-black text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="pointer-events-none absolute right-3 text-xs font-bold text-slate-400 select-none">
                        CBM
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auto Calculated Row Metrics */}
                {rowCalc && (rowCalc.totalCbm > 0 || rowCalc.numericQty > 0) ? (
                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white border border-teal-200/90 p-3 sm:p-3.5 text-center shadow-xs">
                    <div className="border-r border-slate-100 pr-2">
                      <span className="block text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        Approx. Blocks
                      </span>
                      <span className="text-sm sm:text-base font-black font-mono text-navy mt-0.5 block">
                        {formatNumber(rowCalc.numericQty)} Nos
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] sm:text-[11px] font-black text-[#13789B] uppercase tracking-wider">
                        Total CBM
                      </span>
                      <span className="text-sm sm:text-base font-black font-mono text-[#13789B] mt-0.5 block">
                        {rowCalc.totalCbm.toFixed(3)} CBM
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Add Another Block Size Button */}
        <button
          type="button"
          onClick={addBlockSizeRow}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#13789B] bg-teal-50/50 hover:bg-teal-50 px-4 py-2.5 text-xs font-bold text-[#13789B] transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Another Block Size</span>
        </button>

        {/* Section Combined Summary Bar */}
        <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-[#13789B] p-4 sm:p-5 text-white shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-teal-300">
              Total AAC Block Calculation
            </span>
            <span className="text-[11px] text-slate-300">
              {blockItems.length} Size{blockItems.length > 1 ? "s" : ""} Selected
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <span className="block text-[10px] sm:text-xs font-semibold text-teal-300 uppercase">
                Total Order Volume
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-teal-300 block">
                {combinedCbm.toFixed(3)} CBM
              </span>
              <span className="text-[11px] text-slate-300 italic block mt-0.5">
                ≈ {formatNumber(totalBlocks)} Blocks
              </span>
            </div>
            <div>
              <span className="block text-[10px] sm:text-xs font-semibold text-slate-300 uppercase">
                Selected Block Sizes
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-white block">
                {blockItems.length} Size{blockItems.length > 1 ? "s" : ""}
              </span>
              <span className="text-[11px] text-slate-300 italic block mt-0.5">
                Standard Factory Dimensions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BLOCK JOINTING MORTER (40 KG BAG ONLY - PART OF STEP 3)
      ========================================================================= */}
      <div className="rounded-3xl border border-sky-200 bg-sky-50/40 p-4 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
                +
              </span>
              <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
                Block Jointing Morter
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              High-adhesion thin bed mortar for AAC blocks. Packaging: 40 KG Bag only.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-sky-100 border border-sky-300 px-3 py-1 text-[11px] font-black text-sky-900">
            Bag Size: 40 KG
          </span>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[#13789B]">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-navy">
                Block Jointing Morter (40 KG)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Specially formulated pre-mixed thin-bed jointing mortar designed for high-strength AAC block wall masonry. Packaging: <strong>40 KG Bag</strong>.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 grid gap-4 sm:grid-cols-2 items-center">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-navy">
                How many bags do you require?
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={adhesiveBags}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setAdhesiveBags("");
                    } else {
                      const parsed = parseInt(val, 10);
                      setAdhesiveBags(isNaN(parsed) || parsed < 0 ? 0 : parsed);
                    }
                  }}
                  className="w-32 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-mono font-black text-navy shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs font-bold text-slate-600">
                  Bags (40 KG each)
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="h-3.5 w-3.5 text-[#13789B]" />
                <span>Quantity 0 is completely valid</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                If you already have mortar or only require AAC blocks for this consignment, leave quantity as 0.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          STEP 4: ORDER PRICE & REMARKS
      ========================================================================= */}
      <div id="order-price-remarks-section" className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-7 shadow-xs space-y-4 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
                4
              </span>
              <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
                Order Price & Remarks
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter price per CBM and optional notes. Visible only to Super Admin and you (the order creator).
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full px-3 py-1 text-[11px] font-bold border bg-teal-50 text-[#13789B] border-teal-200">
            {pricingCalculations.isPriceAdded
              ? `Subtotal: ₹${pricingCalculations.materialSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
              : "Price Not Added"}
          </span>
        </div>

        {/* Desktop: Side-by-side inputs (Price Per CBM and Notes/Remarks) | Mobile: Stacked vertically */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Price Per CBM (₹) */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-navy uppercase tracking-wider">
              Price Per CBM (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                name="pricePerCbmInput"
                step="0.01"
                min="0"
                value={pricePerCbm}
                onChange={(e) => setPricePerCbm(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Enter price for 1 CBM"
                className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-8 pr-4 font-mono text-sm sm:text-base font-bold text-navy shadow-2xs outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Formula: Material Amount = Order CBM ({combinedCbm.toFixed(3)} m³) × Price Per CBM.
            </p>

            {/* If multiple block sizes, allow separate rate per product line */}
            {blockItems.length > 1 && (
              <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Product-Specific Rates (Optional):
                </span>
                <div className="space-y-1.5">
                  {blockItems.map((item, idx) => {
                    const prod = aacProducts.find((p) => p.id === item.productId);
                    const calc = rowCalculations[idx];
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl text-xs">
                        <span className="font-bold text-navy truncate max-w-[170px]">
                          {formatBlockSizeName(prod?.sizeLabel || `Size ${idx + 1}`)}
                          <span className="text-slate-400 font-normal ml-1">({calc?.totalCbm?.toFixed(3)} CBM)</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-mono text-xs">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={pricePerCbm ? String(pricePerCbm) : "Rate"}
                            value={item.pricePerCbm ?? ""}
                            onChange={(e) =>
                              updateBlockSizeRow(item.id, {
                                pricePerCbm: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-navy outline-none focus:border-[#13789B]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Notes / Remarks */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-navy uppercase tracking-wider">
              Notes / Remarks
            </label>
            <textarea
              name="pricingRemarksInput"
              rows={3}
              value={pricingRemarks}
              onChange={(e) => setPricingRemarks(e.target.value)}
              placeholder="Enter additional notes regarding pricing terms, payment schedule, or private commercial conditions..."
              className="w-full rounded-2xl border border-slate-300 bg-white p-3.5 text-xs sm:text-sm text-navy shadow-2xs outline-none focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 transition-all resize-none"
            />
            <p className="text-[11px] text-slate-500">
              Keep these private pricing remarks separate from staff operational or delivery instructions.
            </p>
          </div>
        </div>

        {/* Live Calculation Preview Banner */}
        {pricingCalculations.isPriceAdded && (
          <div className="rounded-2xl bg-teal-50/70 border border-teal-200/90 p-3.5 text-xs text-navy flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-bold text-[#13789B] uppercase tracking-wider text-[10px] block">
                Material Amount
              </span>
              <span className="font-black text-sm sm:text-base font-mono text-navy">
                ₹{pricingCalculations.materialSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-slate-500 ml-1.5">
                ({combinedCbm.toFixed(3)} CBM × ₹{pricingCalculations.fallbackRate.toLocaleString("en-IN")}/CBM)
              </span>
            </div>
            {gstBillingSelected && (
              <div className="text-right">
                <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] block">
                  + 18% GST Amount
                </span>
                <span className="font-black text-xs sm:text-sm font-mono text-emerald-800">
                  + ₹{pricingCalculations.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="text-right border-l border-teal-200/80 pl-3">
              <span className="font-bold text-navy uppercase tracking-wider text-[10px] block">
                Estimated Total
              </span>
              <span className="font-black text-sm sm:text-lg font-mono text-[#13789B]">
                ₹{pricingCalculations.finalTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          STEP 5: GST BILLING OPTION
      ========================================================================= */}
      <div id="gst-billing-section" className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-7 shadow-xs space-y-4 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
                5
              </span>
              <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
                GST Billing Option
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify whether your enterprise requires a GST tax invoice or a commercial without-GST bill.
            </p>
          </div>
          <span className={`self-start sm:self-auto rounded-full px-3 py-1 text-[11px] font-bold border ${
            gstBillingSelected
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}>
            {gstBillingSelected ? "GST Invoice Selected" : "Without-GST Commercial Bill"}
          </span>
        </div>

        {/* Question: Do you want GST Billing? */}
        <div className="space-y-3">
          <label className="block text-xs font-black text-navy">
            Do you want GST Billing? *
          </label>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            {/* NO Option */}
            <button
              type="button"
              onClick={() => {
                setGstBillingSelected(false);
                setGstError("");
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold transition-all border cursor-pointer ${
                !gstBillingSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                !gstBillingSelected ? "border-white bg-white text-slate-900" : "border-slate-400"
              }`}>
                {!gstBillingSelected && <Check className="h-3 w-3" />}
              </div>
              <span>No</span>
            </button>

            {/* YES Option */}
            <button
              type="button"
              onClick={() => {
                setGstBillingSelected(true);
                const prefill = gstNumber || initialAssigned?.gstin || customerDefaults.gstin || "";
                if (prefill && !gstNumber) {
                  const cleaned = prefill.toUpperCase().replace(/[^0-9A-Z]/g, "");
                  setGstNumber(cleaned);
                  if (cleaned.length === 15 && !gstVerified) {
                    handleVerifyGst(cleaned);
                  }
                } else if (gstNumber.length === 15 && !gstVerified) {
                  handleVerifyGst(gstNumber);
                }
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold transition-all border cursor-pointer ${
                gstBillingSelected
                  ? "bg-[#13789B] text-white border-[#13789B] shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                gstBillingSelected ? "border-white bg-white text-[#13789B]" : "border-slate-400"
              }`}>
                {gstBillingSelected && <Check className="h-3 w-3" />}
              </div>
              <span>Yes</span>
            </button>
          </div>

          {/* Conditional Message when NO is selected */}
          {!gstBillingSelected && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs space-y-1 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Info className="h-4 w-4 text-[#13789B]" />
                <span className="text-sm font-black text-navy">You will receive a without-GST bill.</span>
              </div>
              <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                Your order consignment will be confirmed and dispatched with standard commercial delivery documentation without GST tax credit breakdown.
              </p>
            </div>
          )}

          {/* Conditional Input & Verification when YES is selected */}
          {gstBillingSelected && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <FileSpreadsheet className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                    You will receive a GST bill. Please enter a valid GST number.
                  </h3>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Official 15-character GSTIN format: 2 state digits + 10-character PAN + entity code + &apos;Z&apos; + checksum.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-emerald-200/60">
                <label className="block text-xs font-black text-navy">
                  GST Number *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={15}
                      required={gstBillingSelected}
                      value={gstNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[\s-]/g, "");
                        setGstNumber(val);
                        setGstVerified(false);
                        setGstError("");
                        if (val.length === 15) {
                          handleVerifyGst(val);
                        }
                      }}
                      onBlur={() => {
                        if (gstNumber.length > 0 && !gstVerified) {
                          handleVerifyGst(gstNumber);
                        }
                      }}
                      placeholder="e.g. 24ABNCS5280K1ZU"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono font-black text-navy uppercase shadow-2xs focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/20 outline-none"
                    />
                    {gstVerified && (
                      <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyGst(gstNumber)}
                    disabled={isVerifyingGst || !gstNumber.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#13789B] hover:bg-[#0f607d] disabled:bg-slate-300 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
                  >
                    {isVerifyingGst ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Verify GST</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Validation Error Display */}
                {gstError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2 mt-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-semibold">{gstError}</span>
                  </div>
                )}

                {/* Display After Verification */}
                {gstVerified && gstRegisteredName && (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs space-y-1.5 mt-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>GST Registered Name: <strong className="font-black text-navy">{gstRegisteredName}</strong></span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-[10px] font-black text-emerald-900">
                        GST Status: {gstStatus || "Active"}
                      </span>
                    </div>
                    {gstState && (
                      <p className="text-[11px] text-emerald-800 pl-5">
                        Registered State: <strong>{gstState}</strong>
                        {gstTradeName && gstTradeName !== gstRegisteredName ? ` • Trade Name: ${gstTradeName}` : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          STEP 6: ORDER SUMMARY & SUBMISSION
      ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#13789B] text-white text-xs font-black">
            6
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-navy tracking-tight">
              Order Summary
            </h2>
            <p className="text-xs text-slate-500">
              Review your consignment specifications before submitting order placement.
            </p>
          </div>
        </div>

        {/* Breakdown Items List */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              AAC Block Consignment
            </span>
            {rowCalculations.map((r, idx) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-0"
              >
                <div>
                  <strong className="text-navy">
                    {formatBlockSizeName(r.product?.sizeLabel) || `Size #${idx + 1}`} AAC Block
                  </strong>
                  <span className="text-slate-500 text-[11px] block font-mono">
                    {r.product?.dimensions} • {r.cbmPerBlock.toFixed(4)} CBM/block
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-navy text-sm block">
                    {r.totalCbm.toFixed(3)} CBM
                  </span>
                  <span className="text-[11px] text-slate-500 italic block">
                    ≈ {formatNumber(r.numericQty)} Blocks
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-xs">
            <div>
              <strong className="text-navy">
                Block Jointing Morter
              </strong>
              <span className="text-slate-500 text-[11px] block">
                Packaging: 40 KG Bag Only
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-navy text-sm block">
                {numAdhesiveBags} Bags
              </span>
              <span className="text-[11px] text-slate-500">
                {numAdhesiveBags > 0 ? `${numAdhesiveBags * 40} KG Total` : "0 Bags"}
              </span>
            </div>
          </div>

          {/* Delivery Details In Summary */}
          <div className="border-t border-slate-200 pt-2 text-xs text-slate-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Delivery Destination
            </span>
            <p className="font-semibold text-navy mt-0.5">
              {customerName ? `${customerName} • ` : ""}
              {deliveryAddress || "Address provided"}
              {city ? `, ${city}` : ""}
              {pincode ? ` - ${pincode}` : ""}
            </p>
          </div>
        </div>

        {/* Verification Alert */}
        <div className="flex items-start gap-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 p-3.5 text-xs text-teal-950">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#13789B] mt-0.5" />
          <p className="leading-relaxed">
            <strong>Order Placement Only:</strong> No online payment or price transaction occurs on this website. Upon placement, your order is instantly registered into the Swarnim plant ERP and assigned for transport logistics.
          </p>
        </div>

        {/* Step 4: PREVIEW ORDER BUTTON */}
        <button
          type="button"
          onClick={async () => {
            if (totalBlocks <= 0 || !deliveryAddress.trim() || !customerName.trim() || !customerMobile.trim()) {
              alert("Please ensure AAC block quantity, customer contact, and delivery address are entered.");
              return;
            }
            if (gstBillingSelected) {
              if (!gstNumber.trim()) {
                setGstError("GST Number is required when GST Billing is selected.");
                const el = document.getElementById("gst-billing-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                return;
              }
              if (!gstVerified) {
                const ok = await handleVerifyGst(gstNumber);
                if (!ok) {
                  const el = document.getElementById("gst-billing-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  return;
                }
              }
            }
            setIsPreviewOpen(true);
          }}
          disabled={isSubmitting || totalBlocks <= 0 || !deliveryAddress.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#13789B] hover:bg-[#0F627F] disabled:bg-slate-300 py-4 px-6 text-sm sm:text-base font-black text-white shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
        >
          <Sparkles className="h-5 w-5" />
          <span>PREVIEW ORDER BEFORE CONFIRMATION</span>
        </button>
      </div>

      {/* =========================================================================
          ORDER PREVIEW MODAL / REVIEW SCREEN (STEP 5 & 6)
      ========================================================================= */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-[#13789B] p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-teal-300 block">
                  Swarnim AAC Block Private Limited
                </span>
                <h3 className="text-lg font-black tracking-tight mt-0.5">
                  Review & Confirm Your Consignment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
              {/* AAC Block Items */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-black text-navy uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-[#13789B]" />
                    <span>Selected AAC Blocks</span>
                  </span>
                  <span className="font-bold text-slate-500">
                    {rowCalculations.length} Size{rowCalculations.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {rowCalculations.map((r, idx) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-1.5 border-b border-slate-200/60 last:border-0"
                    >
                      <div>
                        <strong className="text-navy text-sm font-black">
                          {formatBlockSizeName(r.product?.sizeLabel) || `Size #${idx + 1}`}
                        </strong>
                        <span className="text-slate-500 text-[11px] block font-mono">
                          Dimensions: {r.product?.dimensions} • {r.cbmPerBlock.toFixed(4)} CBM/block
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-[#13789B] text-sm block">
                          {r.totalCbm.toFixed(3)} CBM
                        </span>
                        <span className="text-slate-500 text-[11px] italic block">
                          ≈ {formatNumber(r.numericQty)} Blocks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-xs font-bold text-navy">
                  <span>Total AAC Block Volume:</span>
                  <span className="font-black font-mono text-base text-[#13789B]">
                    {combinedCbm.toFixed(3)} CBM (≈ {formatNumber(totalBlocks)} Blocks)
                  </span>
                </div>
              </div>

              {/* Block Jointing Morter */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 flex items-center justify-between">
                <div>
                  <strong className="text-navy text-sm font-black block">
                    Block Jointing Morter
                  </strong>
                  <span className="text-slate-500 text-[11px]">
                    Packaging: 40 KG Bag Only • High Polymer Masonry
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-navy text-base block">
                    {numAdhesiveBags} Bags
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {numAdhesiveBags > 0 ? `${numAdhesiveBags * 40} KG` : "0 Bags"}
                  </span>
                </div>
              </div>

              {/* Order Price & Remarks in Order Preview */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-black text-navy uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#13789B] text-white text-[10px] font-black">₹</span>
                    <span>Order Price & Remarks</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    pricingCalculations.isPriceAdded ? "bg-teal-100 text-[#13789B] border border-teal-200" : "bg-slate-200 text-slate-700"
                  }`}>
                    {pricingCalculations.isPriceAdded ? "Price Added" : "Price Not Added"}
                  </span>
                </div>

                {pricingCalculations.isPriceAdded ? (
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Price Per CBM</span>
                        <strong className="text-navy font-mono">
                          {pricingCalculations.fallbackRate > 0 ? `₹${pricingCalculations.fallbackRate.toLocaleString("en-IN")}` : "Per Size Rates"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Material Subtotal</span>
                        <strong className="text-navy font-mono">
                          ₹{pricingCalculations.materialSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    {gstBillingSelected && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-emerald-800">
                        <span className="text-[11px] font-bold">Applicable GST (18%):</span>
                        <span className="font-mono font-black">
                          + ₹{pricingCalculations.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-300 font-bold text-navy">
                      <span className="text-xs font-black uppercase">Final Order Amount:</span>
                      <span className="font-mono text-sm sm:text-base font-black text-[#13789B]">
                        ₹{pricingCalculations.finalTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {pricingRemarks && (
                      <div className="pt-2 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-500 uppercase font-bold block text-[10px]">Private Pricing Remarks</span>
                        <span className="text-slate-700 italic">{pricingRemarks}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-600 text-xs italic pt-1">
                    Price Not Added. Standard volume-based booking.
                  </div>
                )}
              </div>

              {/* GST Billing Option in Order Preview */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-black text-navy uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-[#13789B]" />
                    <span>GST Billing Selection</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    gstBillingSelected ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-200 text-slate-700"
                  }`}>
                    {gstBillingSelected ? "✓ GST Bill Requested" : "Without-GST Bill"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Do you want GST Billing?</span>
                    <strong className="text-navy">{gstBillingSelected ? "Yes" : "No"}</strong>
                  </div>

                  {gstBillingSelected ? (
                    <>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">GST Number</span>
                        <strong className="text-[#13789B] font-mono">{gstNumber}</strong>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">GST Registered Name</span>
                        <strong className="text-navy">{gstRegisteredName || "Verified Entity"}</strong>
                        {gstStatus && (
                          <span className="ml-2 inline-block rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                            Status: {gstStatus}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 text-slate-600 italic text-[11px]">
                      You will receive a without-GST bill. Standard commercial delivery challan will accompany this consignment.
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Destination */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-black text-navy uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#13789B]" />
                    <span>Customer & Delivery Location</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPreviewOpen(false);
                      const el = document.getElementById("delivery-location-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#13789B] hover:underline cursor-pointer"
                  >
                    <span>Edit Location</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {salesmanName && (
                    <div className="col-span-2 pb-1.5 border-b border-slate-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Logged-in Salesman</span>
                        <strong className="text-purple-700 font-bold">{salesmanName}</strong>
                      </div>
                      {isNewCustomer ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          New Customer Registration
                        </span>
                      ) : (
                        <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-[#13789B]">
                          Assigned Customer
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer Name</span>
                    <strong className="text-navy">{customerName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer Mobile</span>
                    <strong className="text-navy font-mono">{customerMobile}</strong>
                  </div>
                  {customerEmail && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Email</span>
                      <span className="text-slate-700">{customerEmail}</span>
                    </div>
                  )}

                  <div className="col-span-2 pt-2 border-t border-slate-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Location Source:</span>
                      <span className="text-[11px] font-bold text-[#13789B] bg-teal-100/70 px-2 py-0.5 rounded-md">
                        {deliveryLocation.locationSource === "GPS"
                          ? "GPS Location"
                          : deliveryLocation.locationSource === "GOOGLE_MAPS_LINK"
                          ? "Google Maps Link"
                          : "Manual Address"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Delivery Address:</span>
                      <span className="text-navy font-semibold block text-xs mt-0.5">{deliveryAddress}</span>
                    </div>

                    {deliveryLocation.nearbyLandmark && (
                      <div className="text-[11px] text-slate-600">
                        <strong>Nearby Landmark:</strong> {deliveryLocation.nearbyLandmark}
                      </div>
                    )}

                    {deliveryLocation.latitude && deliveryLocation.longitude && (
                      <div className="text-[11px] font-mono text-slate-600">
                        <strong>Coordinates:</strong> {deliveryLocation.latitude}, {deliveryLocation.longitude}
                      </div>
                    )}

                    {(deliveryLocation.googleMapsUrl || (deliveryLocation.latitude && deliveryLocation.longitude) || deliveryAddress) && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Google Maps:</span>
                        <a
                          href={
                            deliveryLocation.googleMapsUrl ||
                            (deliveryLocation.latitude && deliveryLocation.longitude
                              ? `https://www.google.com/maps?q=${deliveryLocation.latitude},${deliveryLocation.longitude}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress)}`)
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#13789B] hover:underline"
                        >
                          <span>View Location</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {notes && (
                    <div className="col-span-2 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Unloading Instructions</span>
                      <span className="text-slate-700 italic">{notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Free Notice */}
              <p className="text-[11px] text-slate-500 italic text-center">
                This confirmation books your physical consignment into Swarnim factory queue. Price and billing are handled separately.
              </p>
            </div>

            {/* Modal Actions: Edit Order vs Confirm & Place Order */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 py-3 px-5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Edit Order</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#13789B] hover:bg-[#0f607d] disabled:bg-slate-300 py-3.5 px-6 text-sm font-black text-white shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isEditing ? "UPDATING ORDER..." : "PLACING ORDER..."}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isEditing ? "CONFIRM & UPDATE ORDER" : "CONFIRM & PLACE ORDER"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
