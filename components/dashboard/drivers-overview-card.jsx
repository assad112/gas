"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import EmptyState from "@/components/shared/empty-state";
import StatusBadge from "@/components/shared/status-badge";
import { useI18n } from "@/hooks/use-i18n";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function SummaryChip({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    ocean: "border-ocean-100 bg-ocean-50 text-ocean-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700"
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

export default function DriversOverviewCard({
  drivers,
  operationalSnapshot
}) {
  const { locale, isRTL } = useI18n();
  const LinkIcon = isRTL ? ChevronLeft : ChevronRight;
  const onlineDrivers = drivers.filter((driver) => driver.status === "online");
  const busyDrivers = drivers.filter(
    (driver) => driver.status === "online" && driver.availability === "busy"
  );

  return (
    <section className="panel-surface overflow-hidden p-0">
      <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow-label">
              {locale === "en" ? "Fleet snapshot" : "لقطة الأسطول"}
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
              {locale === "en"
                ? "Live driver readiness"
                : "جاهزية السائقين المباشرة"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              {locale === "en"
                ? "A cleaner operational read of online drivers, availability status, current workload, and recent location freshness."
                : "قراءة تشغيلية أوضح للسائقين المتصلين وحالة التوفر والحمولة الحالية وحداثة الموقع الأخير."}
            </p>
          </div>

          <Link href="/drivers" className="button-secondary self-start">
            {locale === "en" ? "Open drivers" : "فتح السائقين"}
            <LinkIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryChip
            label={locale === "en" ? "Online now" : "المتصلون الآن"}
            value={formatNumber(onlineDrivers.length, locale)}
            tone="ocean"
          />
          <SummaryChip
            label={locale === "en" ? "Available" : "المتاحون"}
            value={formatNumber(operationalSnapshot?.availableDrivers ?? 0, locale)}
            tone="emerald"
          />
          <SummaryChip
            label={locale === "en" ? "Busy" : "المشغولون"}
            value={formatNumber(busyDrivers.length, locale)}
            tone="rose"
          />
        </div>
      </div>

      {drivers.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={
              locale === "en"
                ? "No drivers linked yet"
                : "لا يوجد سائقون مرتبطون بعد"
            }
            description={
              locale === "en"
                ? "The fleet workspace is ready, but no driver records are available yet."
                : "مساحة الأسطول جاهزة، لكن لا توجد سجلات سائقين متاحة بعد."
            }
          />
        </div>
      ) : (
        <div className="space-y-4 p-6">
          {drivers.slice(0, 5).map((driver) => (
            <article
              key={driver.id}
              className="rounded-[26px] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,0.96))] p-5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-ocean-100 hover:shadow-[0_22px_40px_-28px_rgba(15,23,42,0.22)]"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-950">
                        {driver.name}
                      </h3>
                      {driver.currentOrderId ? (
                        <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                          {locale === "en" ? "Current order" : "الطلب الحالي"} #
                          <span className="numeric-ltr">{driver.currentOrderId}</span>
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm leading-7 text-slate-600">
                      {driver.currentLocation ||
                        (locale === "en"
                          ? "No location update yet"
                          : "لا يوجد تحديث موقع بعد")}
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[18px] border border-slate-100 bg-white/80 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {locale === "en" ? "Phone" : "الهاتف"}
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-900 numeric-ltr">
                          {driver.phone || "--"}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-slate-100 bg-white/80 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {locale === "en" ? "Last location" : "آخر تحديث موقع"}
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          {formatRelativeTime(
                            driver.lastLocationAt || driver.lastSeenAt,
                            locale
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex flex-wrap gap-2",
                      isRTL ? "justify-end" : "justify-start"
                    )}
                  >
                    <StatusBadge status={driver.status} />
                    <StatusBadge status={driver.availability} />
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
