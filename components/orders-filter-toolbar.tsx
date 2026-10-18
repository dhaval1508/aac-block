"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ArrowUpDown, RotateCcw } from "lucide-react";

interface StatusTab {
  key: string;
  label: string;
  count: number;
}

interface OrdersFilterToolbarProps {
  initialSearch: string;
  status: string;
  payment?: string;
  sort: string;
  preset?: string;
  from?: string;
  to?: string;
  tabs: StatusTab[];
  isFiltered: boolean;
}

export function OrdersFilterToolbar({
  initialSearch,
  status,
  sort,
  preset,
  from,
  to,
  tabs,
  isFiltered,
}: OrdersFilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilters = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Reset page on filter change
    params.delete("page");

    Object.entries(overrides).forEach(([key, value]) => {
      if (!value || value === "all" || (key === "sort" && value === "newest")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q") as string;
    updateFilters({ q: q?.trim() ? q.trim() : undefined });
  };

  return (
    <div className="card rounded-3xl bg-white border border-slate-200 p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4 min-w-0">
      {/* Row 1: Search and Secondary Dropdowns */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            name="q"
            defaultValue={initialSearch}
            placeholder="Search Order #, Customer, Company, Truck, Driver..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/10 outline-none transition-colors"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <select
              defaultValue={sort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="bg-transparent font-semibold text-navy outline-none cursor-pointer text-xs"
              aria-label="Sort orders"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>

          {/* Clear All Filters */}
          {isFiltered && (
            <Link
              href="/admin/orders"
              className="flex items-center gap-1.5 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              title="Reset all active filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Link>
          )}
        </div>
      </div>

      {/* Row 2: Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-2 border-t border-slate-100 min-w-0">
        {tabs.map((tab) => {
          const active = (status || "all") === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => updateFilters({ status: tab.key })}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                active
                  ? "bg-[#13789B] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  active ? "bg-white/20 text-white" : "bg-white text-slate-500 border border-slate-200"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
