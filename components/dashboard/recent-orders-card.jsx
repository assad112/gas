"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import EmptyState from "@/components/shared/empty-state";
import StatusBadge from "@/components/shared/status-badge";
import { useI18n } from "@/hooks/use-i18n";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  formatRelativeTime,
  getPaymentMethodLabel
} from "@/lib/format";
import { cn } from "@/lib/utils";

function SummaryChip({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    brand: "border-brand-100 bg-brand-50 text-brand-700",
    ocean: "border-ocean-100 bg-ocean-50 text-ocean-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700"
  };

  return (
    <div
      className={cn(
        "rounded-[20px] border px-4 py-3",
        tones[tone] || tones.slate
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
        {label}
      </p>
      <p className="mt-2 text-xl font-extrabold">{value}</p>
    </div>
  );
}

export default function RecentOrdersCard({
  orders,
  stats,
  currencyCode = "OMR"
}) {
  const { locale, isRTL } = useI18n();
  const LinkIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <section className="panel-surface overflow-hidden p-0">
      <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow-label">
              {locale === "en" ? "Latest orders" : "أحدث الطلبات"}
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
              {locale === "en"
                ? "Operational order queue"
                : "طابور الطلبات التشغيلي"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              {locale === "en"
                ? "A focused stream of the latest real orders with status, timing, payment, and customer-facing commercial context."
                : "عرض مركز لآخر الطلبات الحقيقية مع الحالة والتوقيت والدفع والسياق التجاري الظاهر للعميل."}
            </p>
          </div>

          <Link href="/orders" className="button-secondary self-start">
            {locale === "en" ? "Open all orders" : "فتح جميع الطلبات"}
            <LinkIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryChip
            label={locale === "en" ? "Pending" : "المعلق"}
            value={formatNumber(
              stats ? stats.newOrders : orders.filter((order) => order.status === "pending").length,
              locale
            )}
            tone="brand"
          />
          <SummaryChip
            label={locale === "en" ? "In execution" : "قيد التنفيذ"}
            value={formatNumber(
              stats ? stats.active : orders.filter((order) => order.status === "accepted").length,
              locale
            )}
            tone="ocean"
          />
          <SummaryChip
            label={locale === "en" ? "Completed" : "المكتمل"}
            value={formatNumber(
              stats ? stats.completed : orders.filter((order) => order.status === "delivered").length,
              locale
            )}
            tone="emerald"
          />
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={
              locale === "en" ? "No recent orders yet" : "لا توجد طلبات حديثة بعد"
            }
            description={
              locale === "en"
                ? "The live queue is ready, but there are no recent orders to display right now."
                : "طابور الطلبات المباشر جاهز، لكن لا توجد طلبات حديثة للعرض حالياً."
            }
          />
        </div>
      ) : (
        <div className="space-y-4 p-6">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-[26px] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,0.96))] p-5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-[0_22px_40px_-28px_rgba(15,23,42,0.22)]"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-950">
                      <span className="numeric-ltr">#{order.id}</span> - {order.name}
                    </h3>
                    <StatusBadge status={order.status} />
                  </div>

                  <p className="text-sm leading-7 text-slate-600">
                    {order.addressFull || order.location}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {order.gasType || (locale === "en" ? "Gas order" : "طلب غاز")}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {locale === "en" ? "Qty" : "الكمية"}:{" "}
                      <span className="numeric-ltr">{order.quantity || 1}</span>
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {getPaymentMethodLabel(order.paymentMethod, locale)}
                    </span>
                  </div>
                </div>

                <div
                  className={cn(
                    "grid gap-3 xl:min-w-[240px]",
                    isRTL ? "text-right" : "text-left"
                  )}
                >
                  <div className="rounded-[20px] border border-slate-100 bg-white/80 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {locale === "en" ? "Created at" : "وقت الإنشاء"}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {formatDateTime(order.createdAt, locale)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatRelativeTime(order.createdAt, locale)}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-slate-100 bg-white/80 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {locale === "en" ? "Commercial total" : "الإجمالي التجاري"}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {order.totalAmount !== null && order.totalAmount !== undefined
                        ? formatMoney(order.totalAmount, locale, currencyCode)
                        : locale === "en"
                          ? "Not calculated yet"
                          : "لم يُحسب بعد"}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
