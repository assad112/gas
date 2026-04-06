"use client";

import EmptyState from "@/components/shared/empty-state";
import StatusBadge from "@/components/shared/status-badge";
import { useI18n } from "@/hooks/use-i18n";

export default function DriversOverviewCard({ drivers }) {
  const { t, locale } = useI18n();
  const onlineDrivers = drivers.filter((driver) => driver.status === "online");

  return (
    <section className="panel-surface p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow-label">{t("dashboard.driversSnapshot")}</p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900">
            {t("dashboard.driversSnapshot")}
          </h2>
        </div>

        <div className="w-full rounded-[22px] bg-ocean-50 px-4 py-3 text-start sm:w-auto">
          <p className="text-xs font-semibold text-ocean-700">
            {t("dashboard.onlineNow")}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-ocean-900">
            {onlineDrivers.length}
          </p>
        </div>
      </div>

      {drivers.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={
              locale === "en"
                ? "No drivers linked yet"
                : "لا يوجد سائقون مرتبطون بعد"
            }
            description={
              locale === "en"
                ? "The dashboard is connected to the drivers endpoint, but no driver records exist yet."
                : "لوحة التحكم مرتبطة فعليًا بواجهة السائقين، لكن لا توجد سجلات سائقين حتى الآن."
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {drivers.slice(0, 4).map((driver) => (
            <article
              key={driver.id}
              className="rounded-[24px] border border-slate-100 bg-white/80 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {driver.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {driver.currentLocation ||
                      (locale === "en" ? "No location yet" : "لا يوجد موقع بعد")}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    <span className="numeric-ltr">{driver.phone}</span>
                  </p>
                  {driver.currentOrderId ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {locale === "en" ? "Current order" : "الطلب الحالي"}: #
                      <span className="numeric-ltr">{driver.currentOrderId}</span>
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <StatusBadge status={driver.status} />
                  <StatusBadge status={driver.availability} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
