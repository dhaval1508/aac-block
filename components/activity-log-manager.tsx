"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Search,
  User,
  CreditCard,
  Package,
  Layers,
  Clock,
  ExternalLink,
  List,
  RotateCcw,
  UserPlus,
  Eye,
  X,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { DateRangeFilter } from "@/components/date-range-filter";

export type UnifiedActivity = {
  id: string;
  category: "ORDER" | "STOCK" | "PAYMENT" | "USER";
  eventType: string;
  title: string;
  description: string;
  recordRef?: string;
  recordHref?: string;
  user: {
    name: string;
    role?: string;
  };
  timestamp: string;
  delta?: {
    type: "positive" | "negative" | "neutral";
    value: string;
  };
  details?: Record<string, string | number | null | undefined>;
};

export function ActivityLogManager({
  items,
  periodLabel = "This Month",
}: {
  items: UnifiedActivity[];
  periodLabel?: string;
}) {
  const [activeTab, setActiveTab] = useState<"ALL" | "ORDER" | "STOCK" | "USER">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actorFilter, setActorFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"TIMELINE" | "TABLE">("TIMELINE");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<UnifiedActivity | null>(null);
  const pageSize = 20;

  // Distinct actors for actor filter
  const actors = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.user.name) set.add(it.user.name);
    });
    return Array.from(set).sort();
  }, [items]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      ALL: items.length,
      ORDER: items.filter((i) => i.category === "ORDER").length,
      STOCK: items.filter((i) => i.category === "STOCK").length,
      USER: items.filter((i) => i.category === "USER").length,
    };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category match
      if (activeTab !== "ALL" && item.category !== activeTab) return false;

      // Actor match
      if (actorFilter !== "ALL" && item.user.name !== actorFilter) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = item.recordRef?.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesActor = item.user.name.toLowerCase().includes(q);
        const matchesType = item.eventType.toLowerCase().includes(q);
        if (!matchesRef && !matchesTitle && !matchesDesc && !matchesActor && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeTab, actorFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleTabChange = (tab: "ALL" | "ORDER" | "STOCK" | "USER") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setActorFilter("ALL");
    setCurrentPage(1);
  };

  const getCategoryBadge = (cat: UnifiedActivity["category"]) => {
    switch (cat) {
      case "ORDER":
        return {
          icon: Layers,
          label: "Order",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "STOCK":
        return {
          icon: Package,
          label: "Stock",
          bg: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "PAYMENT":
        return {
          icon: CreditCard,
          label: "Payment",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "USER":
        return {
          icon: UserPlus,
          label: "Team / User",
          bg: "bg-purple-50 text-purple-700 border-purple-200",
        };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 lg:p-8 min-w-0 max-w-full">
      {/* Top Header & Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#13789B]/10 text-[#13789B]">
                <Activity className="h-5 w-5" />
              </span>
              <span className="truncate">Audit Trail & Operational Activity Feed</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
            Chronological log of material movements, order stages, and user account actions.
          </p>
        </div>

        {/* Action Controls: Date Range Filter & View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          <DateRangeFilter />

          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("TIMELINE")}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === "TIMELINE"
                  ? "bg-[#13789B] text-white shadow-xs"
                  : "text-slate-600 hover:text-navy hover:bg-slate-50"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === "TABLE"
                  ? "bg-[#13789B] text-white shadow-xs"
                  : "text-slate-600 hover:text-navy hover:bg-slate-50"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Operational KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4 min-w-0">
        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-slate-400 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate block">Total Audited</span>
            <Activity className="h-4 w-4 text-slate-500 shrink-0" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{counts.ALL.toLocaleString()}</div>
          <p className="mt-0.5 text-[10px] text-slate-400 truncate block">Recorded actions</p>
        </div>

        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-blue-500 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate block">Milestones</span>
            <Layers className="h-4 w-4 text-blue-600 shrink-0" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{counts.ORDER.toLocaleString()}</div>
          <p className="mt-0.5 text-[10px] text-slate-400 truncate block">Order updates</p>
        </div>

        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-amber-500 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate block">Movements</span>
            <Package className="h-4 w-4 text-amber-600 shrink-0" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{counts.STOCK.toLocaleString()}</div>
          <p className="mt-0.5 text-[10px] text-slate-400 truncate block">Stock ledger</p>
        </div>

        <div className="card p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-purple-500 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate block">User Events</span>
            <UserPlus className="h-4 w-4 text-purple-600 shrink-0" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-navy truncate">{counts.USER.toLocaleString()}</div>
          <p className="mt-0.5 text-[10px] text-slate-400 truncate block">User records</p>
        </div>
      </div>

      {/* Main Filter & Navigation Panel */}
      <div className="card rounded-3xl bg-white border border-slate-200 shadow-sm p-5 space-y-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {[
            { id: "ALL", label: "All Activity", count: counts.ALL },
            { id: "ORDER", label: "Orders", count: counts.ORDER },
            { id: "STOCK", label: "Stock Movements", count: counts.STOCK },
            { id: "USER", label: "User Management", count: counts.USER },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#13789B] text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-navy"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by order #, description, user, note..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-[#13789B] focus:ring-2 focus:ring-[#13789B]/10 outline-none"
            />
          </div>

          {/* Actor & Date Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Actor Filter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={actorFilter}
                onChange={(e) => {
                  setActorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-navy outline-none cursor-pointer"
              >
                <option value="ALL">All Staff & Actors</option>
                {actors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters button if active */}
            {(searchQuery || actorFilter !== "ALL") && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-navy transition-colors"
                title="Reset filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing <strong className="text-navy">{filteredItems.length}</strong> recorded activities
          </span>
          {totalPages > 1 && (
            <span>
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Main Content: Timeline vs Table */}
      {viewMode === "TIMELINE" ? (
        <div className="space-y-3">
          {paginatedItems.map((item) => {
            const badge = getCategoryBadge(item.category);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={item.id}
                className="card rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:border-[#13789B]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left: Icon, Category, Title, Description */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${badge.bg}`}
                  >
                    <BadgeIcon className="h-4 w-4" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-navy text-sm">{item.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}
                      >
                        {item.eventType}
                      </span>
                      {item.recordRef && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                          {item.recordRef}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <User className="h-3 w-3 text-slate-400" />
                        {item.user.name}
                        {item.user.role && (
                          <span className="text-[10px] text-slate-400">({item.user.role})</span>
                        )}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quantity / Amount Delta & Actions */}
                <div className="flex items-center gap-3 sm:self-center self-end pl-12 sm:pl-0">
                  {item.delta && (
                    <div
                      className={`text-right font-black text-sm px-2.5 py-1 rounded-xl ${
                        item.delta.type === "positive"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.delta.type === "negative"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.delta.value}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    {item.recordHref && (
                      <Link
                        href={item.recordHref}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-[#13789B] hover:text-white hover:border-[#13789B] transition-colors"
                        title="View Record"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-[#13789B] hover:text-white hover:border-[#13789B] transition-colors"
                      title="Inspect Event Details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="card rounded-3xl bg-white border border-slate-200 p-12 text-center">
              <Activity className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-navy">No activity logs match your filters</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try loosening your search terms or clearing your date and actor filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-navy hover:bg-slate-200 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Audit Table View */
        <div className="card rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  <th className="py-3.5 px-4 font-bold">Category & Event</th>
                  <th className="py-3.5 px-4 font-bold">Reference / Target</th>
                  <th className="py-3.5 px-4 font-bold">Description</th>
                  <th className="py-3.5 px-4 font-bold">Responsible Actor</th>
                  <th className="py-3.5 px-4 font-bold text-right">Impact / Delta</th>
                  <th className="py-3.5 px-4 font-bold">Date & Time</th>
                  <th className="py-3.5 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item) => {
                  const badge = getCategoryBadge(item.category);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-bold text-navy">{item.eventType}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.recordRef ? (
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.recordRef}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 font-medium">
                        {item.description}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-navy">{item.user.name}</span>
                          {item.user.role && (
                            <span className="text-[10px] text-slate-400">{item.user.role}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item.delta ? (
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-lg ${
                              item.delta.type === "positive"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.delta.type === "negative"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.delta.value}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(item.timestamp)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.recordHref && (
                            <Link
                              href={item.recordHref}
                              className="rounded-lg p-1.5 text-slate-500 hover:text-navy hover:bg-slate-100 transition-colors"
                              title="Go to record"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:text-[#13789B] hover:bg-slate-100 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No activity logs match your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between card rounded-2xl bg-white border border-slate-200 px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>
          <div className="text-xs font-semibold text-slate-500">
            Page <span className="font-bold text-navy">{currentPage}</span> of{" "}
            <span className="font-bold text-navy">{totalPages}</span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      )}

      {/* Detailed Inspection Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg my-auto max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 min-w-0">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {selectedItem.category} Audit Record
                </span>
                <h3 className="text-base font-black text-navy mt-0.5 break-words">{selectedItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3 sm:p-3.5 border border-slate-100 space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 shrink-0">Event Action:</span>
                  <span className="font-bold text-navy text-right break-words">{selectedItem.eventType}</span>
                </div>
                {selectedItem.recordRef && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 shrink-0">Reference:</span>
                    <span className="font-mono font-bold text-navy text-right break-all">{selectedItem.recordRef}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 shrink-0">Responsible:</span>
                  <span className="font-bold text-navy text-right truncate">
                    {selectedItem.user.name} {selectedItem.user.role && `(${selectedItem.user.role})`}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 shrink-0">Timestamp:</span>
                  <span className="font-medium text-slate-700 text-right">{formatDateTime(selectedItem.timestamp)}</span>
                </div>
                {selectedItem.delta && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 shrink-0">Impact:</span>
                    <span className="font-black text-sm text-navy">{selectedItem.delta.value}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-navy text-xs mb-1">Description / Log Note:</h4>
                <p className="rounded-xl bg-white border border-slate-200 p-3 text-slate-700 text-xs font-medium break-words leading-relaxed">
                  {selectedItem.description}
                </p>
              </div>

              {selectedItem.details && Object.keys(selectedItem.details).length > 0 && (
                <div>
                  <h4 className="font-bold text-navy text-xs mb-1">Metadata Attributes:</h4>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1.5 font-mono text-[11px]">
                    {Object.entries(selectedItem.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 text-slate-600">
                        <span className="text-slate-400 shrink-0">{k}:</span>
                        <span className="font-semibold text-navy text-right break-all">{String(v ?? "—")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 flex-wrap">
              {selectedItem.recordHref && (
                <Link
                  href={selectedItem.recordHref}
                  className="rounded-xl bg-[#13789B] px-4 py-2 text-xs font-bold text-white hover:bg-[#13789B]/90 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Full Record
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
