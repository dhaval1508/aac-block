"use client";

import { useRouter } from "next/navigation";
import { AACBlockCalculator } from "@/components/aac-block-calculator";
import { Calculator } from "lucide-react";

export function DashboardCalculatorSection({
  rates = {},
  initialSize = '6"',
}: {
  rates?: Record<string, number>;
  initialSize?: string;
}) {
  const router = useRouter();

  const handleAddToOrder = (data: {
    size: string;
    quantity: number;
    totalCbm: number;
    totalSqft: number;
    mortarBags?: number;
  }) => {
    const params = new URLSearchParams({
      quantity: String(data.quantity),
      mortarBags: String(data.mortarBags || 0),
    });
    router.push(`/customer/new-order?${params.toString()}`);
  };

  return (
    <div id="calculator" className="space-y-3 scroll-mt-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#13789B] text-white">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-navy uppercase tracking-wider">
              AAC Block & Mortar Engineering Calculator
            </h2>
            <p className="text-xs text-slate-500">
              Calculate exact volume (CBM), required physical blocks, and thin-bed mortar bags.
            </p>
          </div>
        </div>
      </div>

      <AACBlockCalculator
        rates={rates}
        initialSize={initialSize}
        onAddToOrder={handleAddToOrder}
      />
    </div>
  );
}
