"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { useI18n } from "@/hooks/use-i18n";
import EmptyState from "@/components/shared/empty-state";
import StatusBadge from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function RecentOrdersCard({ orders }) {
  const { t, locale, isRTL } = useI18n();
  const LinkIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <section className="panel-surface p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow-label">{t("dashboard.latestOrders")}</p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900">
            {t("dashboard.latestOrdersHeading")}
          </h2>
        </div>

        <Link href="/orders" className="button-secondary self-start">
          {t("common.allOrders")}
          <LinkIcon className="h-4 w-4" />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t("dashboard.latestOrdersEmptyTitle")}
            description={t("dashboard.latestOrdersEmptyDescription")}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 transition hover:border-brand-100 hover:bg-brand-50/40"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      <span className="numeric-ltr">#{order.id}</span> - {order.name}
                    </h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {order.addressFull || order.location} • {order.gasType}
                  </p>
                </div>

                <div className={cn("numeric-ltr text-sm text-slate-500")}>
                  {formatDateTime(order.createdAt, locale)}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
