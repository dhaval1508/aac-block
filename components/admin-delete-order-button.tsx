"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { DeleteOrderModal } from "@/components/delete-order-modal";

export function AdminDeleteOrderButton({
  order,
  returnPath = "/admin/orders",
}: {
  order: {
    id: string;
    orderNo: string;
    status: string;
    totalCbm?: number | string | null;
    quantity: number;
    adhesiveBags?: number | null;
    customerName: string;
    companyName?: string | null;
    dcNumber?: string | null;
    invoiceNo?: string | null;
    hasDispatchedStock?: boolean;
    hasDelivered?: boolean;
    hasChallanOrInvoice?: boolean;
  };
  returnPath?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
        title="Delete or Archive this order"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete Order</span>
      </button>

      {open && (
        <DeleteOrderModal
          order={order}
          onClose={() => setOpen(false)}
          returnPath={returnPath}
        />
      )}
    </>
  );
}
