import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StockerActivityPage() {
  const session = await getSession();
  if (!session || !["STOCKER", "ADMIN"].includes(session.role)) redirect("/login");

  const [movements, events] = await Promise.all([
    prisma.stockMovement.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { sizeLabel: true } },
        order: { select: { orderNo: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.orderEvent.findMany({
      where: {
        title: { not: "Payment Received" },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { orderNo: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 min-w-0 max-w-full">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-black text-navy truncate">Operational Activity Log</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Audit trail of material movements and physical order status updates.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 min-w-0">
        {/* Stock Movements */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-navy mb-3 sm:mb-4">Recent Stock Movements</h2>
          <div className="space-y-2.5 sm:space-y-3">
            {movements.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-100 p-2.5 sm:p-3 text-xs min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-navy truncate">{m.product.sizeLabel}</span>
                  <span
                    className={`font-bold shrink-0 ${
                      m.quantityDelta > 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {m.quantityDelta > 0 ? `+${formatNumber(m.quantityDelta)}` : formatNumber(m.quantityDelta)}{" "}
                    blocks
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-slate-400 text-[11px]">
                  <span className="truncate">{m.note || m.type}</span>
                  <span className="shrink-0">{formatDateTime(m.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Logistics Events */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-navy mb-3 sm:mb-4">Order Logistics Milestones</h2>
          <div className="space-y-2.5 sm:space-y-3">
            {events.map((e) => (
              <div key={e.id} className="rounded-xl border border-slate-100 p-2.5 sm:p-3 text-xs min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-navy truncate">{e.order.orderNo}</span>
                  <span className="font-semibold text-slate-700 truncate">{e.title}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-slate-400 text-[11px]">
                  <span className="truncate">{e.note || "Status updated"}</span>
                  <span className="shrink-0">{formatDateTime(e.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
