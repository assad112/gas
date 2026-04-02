"use client";

import { ArrowUpLeft, ArrowUpRight } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneStyles = {
  amber: {
    icon: "bg-brand-50 text-brand-700",
    glow: "from-brand-100 via-brand-50 to-transparent"
  },
  rose: {
    icon: "bg-rose-50 text-rose-700",
    glow: "from-rose-100 via-rose-50 to-transparent"
  },
  sky: {
    icon: "bg-sky-50 text-sky-700",
    glow: "from-sky-100 via-sky-50 to-transparent"
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700",
    glow: "from-emerald-100 via-emerald-50 to-transparent"
  },
  teal: {
    icon: "bg-ocean-50 text-ocean-700",
    glow: "from-ocean-100 via-ocean-50 to-transparent"
  },
  slate: {
    icon: "bg-slate-100 text-slate-700",
    glow: "from-slate-200 via-slate-50 to-transparent"
  }
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "amber"
}) {
  const { locale, t, isRTL } = useI18n();
  const toneStyle = toneStyles[tone] || toneStyles.amber;
  const TrendIcon = isRTL ? ArrowUpLeft : ArrowUpRight;

  return (
    <article className="panel-surface group relative overflow-hidden p-5">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-70",
          toneStyle.glow
        )}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h3 className="text-3xl font-extrabold tracking-tight text-slate-950">
            {formatNumber(value, locale)}
          </h3>
          <p className="text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>

        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-[22px] shadow-sm",
            toneStyle.icon
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
        <TrendIcon className="h-4 w-4 text-brand-500" />
        {t("dashboard.directOperationalVision")}
      </div>
    </article>
  );
}
