import { OrderStatus } from "@prisma/client";
import { cn, ORDER_STATUS_LABEL, ORDER_STATUS_CLASS } from "@/lib/utils";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-bold border",
        ORDER_STATUS_CLASS[status] || "bg-slate-100 text-slate-700"
      )}
    >
      {ORDER_STATUS_LABEL[status] || status}
    </span>
  );
}
