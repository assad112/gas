"use client";

import { useI18n } from "@/hooks/use-i18n";
import { getStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneMap = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  accepted: "bg-sky-50 text-sky-700 ring-sky-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  online: "bg-ocean-50 text-ocean-700 ring-ocean-200",
  offline: "bg-slate-100 text-slate-600 ring-slate-200",
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  busy: "bg-rose-50 text-rose-700 ring-rose-200"
};

export default function StatusBadge({ status, className }) {
  const { locale } = useI18n();

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset",
        toneMap[status] || toneMap.offline,
        className
      )}
    >
      {getStatusLabel(status, locale)}
    </span>
  );
}
