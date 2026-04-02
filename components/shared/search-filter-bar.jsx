"use client";

import {
  ArrowDownWideNarrow,
  RefreshCcw,
  Search,
  SlidersHorizontal
} from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { getStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

function ControlShell({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.45)]">
      {children}
    </div>
  );
}

export default function SearchFilterBar({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  sortOrder,
  onSortOrderChange,
  onRefresh,
  isRefreshing,
  statusOptions = ["pending", "accepted", "delivered", "cancelled"]
}) {
  const { t, isRTL, locale } = useI18n();

  return (
    <section className="panel-surface overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-950 px-4 py-3 text-white lg:px-5">
        <div>
          <p className="text-xs font-semibold text-slate-300">
            {locale === "en" ? "Operational filters" : "فلاتر تشغيلية"}
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {locale === "en"
              ? "Search and narrow the live orders queue"
              : "ابحث وفلتر قائمة الطلبات المباشرة"}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto"
        >
          <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          {t("common.update")}
        </button>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.6fr)_220px_220px] lg:p-5">
        <ControlShell>
          <div className="relative">
            <Search
              className={cn(
                "pointer-events-none absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400",
                isRTL ? "right-3" : "left-3"
              )}
            />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t("search.placeholder")}
              className={cn(
                "h-11 w-full rounded-xl border border-transparent bg-transparent px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-200 focus:bg-brand-50/30",
                isRTL ? "pr-10" : "pl-10"
              )}
            />
          </div>
        </ControlShell>

        <ControlShell>
          <div className="relative">
            <SlidersHorizontal
              className={cn(
                "pointer-events-none absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400",
                isRTL ? "right-3" : "left-3"
              )}
            />
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              className={cn(
                "h-11 w-full appearance-none rounded-xl border border-transparent bg-transparent px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-200 focus:bg-brand-50/30",
                isRTL ? "pr-10" : "pl-10"
              )}
            >
              <option value="all">{t("search.allStatuses")}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status, locale)}
                </option>
              ))}
            </select>
          </div>
        </ControlShell>

        <ControlShell>
          <div className="relative">
            <ArrowDownWideNarrow
              className={cn(
                "pointer-events-none absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400",
                isRTL ? "right-3" : "left-3"
              )}
            />
            <select
              value={sortOrder}
              onChange={(event) => onSortOrderChange(event.target.value)}
              className={cn(
                "h-11 w-full appearance-none rounded-xl border border-transparent bg-transparent px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-200 focus:bg-brand-50/30",
                isRTL ? "pr-10" : "pl-10"
              )}
            >
              <option value="desc">{t("search.newest")}</option>
              <option value="asc">{t("search.oldest")}</option>
            </select>
          </div>
        </ControlShell>
      </div>
    </section>
  );
}
