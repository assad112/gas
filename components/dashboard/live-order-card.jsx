"use client";

import { BellRing, Sparkles, X } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import StatusBadge from "@/components/shared/status-badge";
import { formatDateTime, getPaymentMethodLabel } from "@/lib/format";

export default function LiveOrderCard({ order, onDismiss }) {
  const { t, locale, isRTL } = useI18n();

  return (
    <section
      className={`panel-surface relative overflow-hidden border-brand-100 p-5 ${
        isRTL
          ? "bg-gradient-to-l from-brand-50/80 via-white to-white"
          : "bg-gradient-to-r from-brand-50/80 via-white to-white"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/80 to-transparent" />
      <div className="pointer-events-none absolute -right-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-brand-200/60 blur-2xl" />
      <div
        className={`absolute top-0 h-full w-2 bg-brand-500 ${
          isRTL ? "right-0 rounded-l-full" : "left-0 rounded-r-full"
        }`}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-brand-100 text-brand-700">
            <BellRing className="h-6 w-6" />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
                {t("dashboard.newOrderNow")}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {t("dashboard.orderLabel", {
                id: order.id,
                name: order.name
              })}
            </h2>
            <p className="text-sm text-slate-600">
              {order.addressFull || order.location} / {order.gasType} /{" "}
              {getPaymentMethodLabel(order.paymentMethod, locale)}
            </p>
            <p className="text-sm text-slate-500">
              <span className="numeric-ltr">
                {formatDateTime(order.createdAt, locale)}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="button-secondary self-start lg:self-center"
        >
          <X className="h-4 w-4" />
          {t("dashboard.dismiss")}
        </button>
      </div>
    </section>
  );
}
