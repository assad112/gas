"use client";

import {
  Clock3,
  MapPinned,
  Navigation,
  RefreshCcw,
  ShieldCheck
} from "lucide-react";
import { useMemo } from "react";

import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import ZonesTable from "@/components/zones/zones-table";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, title, value, subtitle, tone = "brand" }) {
  const tones = {
    brand: "from-brand-100 to-brand-50 text-brand-900",
    emerald: "from-emerald-100 to-emerald-50 text-emerald-900",
    ocean: "from-ocean-100 to-ocean-50 text-ocean-900",
    slate: "from-slate-100 to-slate-50 text-slate-900"
  };

  return (
    <article className="panel-surface relative overflow-hidden p-5">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-20 bg-gradient-to-b opacity-75",
          tones[tone] || tones.brand
        )}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">{value}</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">{subtitle}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/85 shadow-sm">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </article>
  );
}

export default function ZonesPage() {
  const { zones, resources, refreshZones, saveZone, deleteZone, zoneMutationIds } =
    useAdmin();
  const { locale, isRTL } = useI18n();
  const currencyCode = "OMR";

  const zoneStats = useMemo(() => {
    const totalZones = zones.length;
    const activeZones = zones.filter((zone) => zone.isActive).length;
    const zonesWithPolygons = zones.filter(
      (zone) => Array.isArray(zone.polygon) && zone.polygon.length >= 3
    ).length;
    const governorates = new Set(
      zones.map((zone) => zone.governorate).filter(Boolean)
    ).size;
    const averageDeliveryFee =
      totalZones > 0
        ? zones.reduce((sum, zone) => sum + Number(zone.deliveryFee || 0), 0) /
          totalZones
        : 0;
    const averageEta =
      totalZones > 0
        ? zones.reduce(
            (sum, zone) => sum + Number(zone.estimatedDeliveryMinutes || 0),
            0
          ) / totalZones
        : 0;

    return {
      totalZones,
      activeZones,
      zonesWithPolygons,
      governorates,
      averageDeliveryFee,
      averageEta
    };
  }, [zones]);

  const zoneHighlights = useMemo(() => {
    const inactiveZones = Math.max(zoneStats.totalZones - zoneStats.activeZones, 0);
    const highestFeeZone = [...zones].sort(
      (left, right) => Number(right.deliveryFee || 0) - Number(left.deliveryFee || 0)
    )[0];
    const slowestZone = [...zones].sort(
      (left, right) =>
        Number(right.estimatedDeliveryMinutes || 0) -
        Number(left.estimatedDeliveryMinutes || 0)
    )[0];

    return {
      inactiveZones,
      highestFeeZone,
      slowestZone
    };
  }, [zoneStats.activeZones, zoneStats.totalZones, zones]);

  if (resources.zones.loading && zones.length === 0) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading zones..." : "جارٍ تحميل المناطق..."}
      />
    );
  }

  if (resources.zones.error && zones.length === 0) {
    return (
      <ErrorState
        title={locale === "en" ? "Unable to load zones" : "تعذر تحميل المناطق"}
        description={resources.zones.error}
        actionLabel={locale === "en" ? "Retry" : "إعادة المحاولة"}
        onAction={() => refreshZones()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface-dark relative overflow-hidden p-6 lg:p-8">
        <div
          className={cn(
            "absolute inset-y-0 w-52",
            isRTL
              ? "right-0 bg-gradient-to-l from-ocean-500/20 to-transparent"
              : "left-0 bg-gradient-to-r from-ocean-500/20 to-transparent"
          )}
        />
        <div
          className={cn(
            "absolute top-6 h-32 w-32 rounded-full bg-brand-300/20 blur-3xl",
            isRTL ? "-left-10" : "-right-10"
          )}
        />

        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
              <MapPinned className="h-3.5 w-3.5" />
              {locale === "en" ? "Coverage studio" : "استوديو التغطية"}
            </span>
            <h1 className="max-w-3xl text-2xl font-extrabold leading-tight text-white lg:text-3xl">
              {locale === "en"
                ? "Professional delivery zone control for coverage, ETA, and operational readiness"
                : "إدارة احترافية لمناطق التوصيل والتغطية والوقت المتوقع والجاهزية التشغيلية"}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
              {locale === "en"
                ? "Review the delivery network from one place, monitor active coverage, and keep fees, ETA, and zone visibility aligned with the live backend."
                : "راجع شبكة التوصيل من مكان واحد، وراقب التغطية النشطة، وحافظ على توافق الرسوم والوقت المتوقع وظهور المناطق مع الباكيند المباشر."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs text-slate-300">
                {locale === "en" ? "Coverage sync" : "مزامنة التغطية"}
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {locale === "en" ? "Live zones linked" : "المناطق مرتبطة مباشرة"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => refreshZones({ silent: true })}
              disabled={resources.zones.refreshing}
              className="button-secondary w-full bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
              <RefreshCcw
                className={cn("h-4 w-4", resources.zones.refreshing && "animate-spin")}
              />
              {locale === "en" ? "Refresh zones" : "تحديث المناطق"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={MapPinned}
          title={locale === "en" ? "Total zones" : "إجمالي المناطق"}
          value={formatNumber(zoneStats.totalZones, locale)}
          subtitle={
            locale === "en"
              ? "All delivery coverage areas currently managed in the dashboard."
              : "كل مناطق التغطية المدارة حالياً داخل لوحة التحكم."
          }
          tone="brand"
        />
        <StatCard
          icon={ShieldCheck}
          title={locale === "en" ? "Active now" : "النشطة الآن"}
          value={formatNumber(zoneStats.activeZones, locale)}
          subtitle={
            locale === "en"
              ? "Zones currently available for the live delivery network."
              : "المناطق المتاحة حالياً ضمن شبكة التوصيل المباشرة."
          }
          tone="emerald"
        />
        <StatCard
          icon={Navigation}
          title={locale === "en" ? "Average delivery fee" : "متوسط رسوم التوصيل"}
          value={formatMoney(zoneStats.averageDeliveryFee, locale, currencyCode)}
          subtitle={
            locale === "en"
              ? "Average operational fee across all configured zones."
              : "متوسط الرسوم التشغيلية عبر جميع المناطق الحالية."
          }
          tone="ocean"
        />
        <StatCard
          icon={Clock3}
          title={locale === "en" ? "Average ETA" : "متوسط الوقت المتوقع"}
          value={`${formatNumber(zoneStats.averageEta, locale)} ${
            locale === "en" ? "min" : "دقيقة"
          }`}
          subtitle={
            locale === "en"
              ? "Estimated delivery time average across the zone network."
              : "متوسط الزمن المتوقع للتوصيل عبر شبكة المناطق."
          }
          tone="slate"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <article className="panel-surface p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow-label">
                {locale === "en" ? "Coverage overview" : "نظرة عامة على التغطية"}
              </p>
              <h2 className="mt-3 text-xl font-extrabold text-slate-950">
                {locale === "en"
                  ? "Read the delivery network before opening any zone card"
                  : "افهم شبكة التوصيل قبل الدخول إلى أي بطاقة منطقة"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                {locale === "en"
                  ? "See active coverage, inactive rows, governorate spread, and polygon readiness from one clean operational view."
                  : "شاهد التغطية النشطة والمناطق غير المفعلة وتوزع المحافظات وجاهزية المضلعات من واجهة تشغيلية واحدة وواضحة."}
              </p>
            </div>

            <div className="glass-chip">
              <Navigation className="h-4 w-4" />
              {locale === "en"
                ? "Zone geometry ready in live backend"
                : "الهندسة الجغرافية جاهزة في الباكيند المباشر"}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {locale === "en" ? "Active zones" : "المناطق النشطة"}
              </p>
              <p className="mt-3 text-3xl font-extrabold text-emerald-950">
                {formatNumber(zoneStats.activeZones, locale)}
              </p>
              <p className="mt-2 text-xs leading-6 text-emerald-800/80">
                {locale === "en"
                  ? "Serving live delivery operations now."
                  : "تخدم عمليات التوصيل المباشرة الآن."}
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {locale === "en" ? "Inactive zones" : "المناطق غير النشطة"}
              </p>
              <p className="mt-3 text-3xl font-extrabold text-slate-950">
                {formatNumber(zoneHighlights.inactiveZones, locale)}
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                {locale === "en"
                  ? "Not currently available in the delivery network."
                  : "غير متاحة حالياً ضمن شبكة التوصيل."}
              </p>
            </div>

            <div className="rounded-[24px] border border-ocean-100 bg-ocean-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ocean-700">
                {locale === "en" ? "Governorates covered" : "المحافظات المغطاة"}
              </p>
              <p className="mt-3 text-3xl font-extrabold text-ocean-950">
                {formatNumber(zoneStats.governorates, locale)}
              </p>
              <p className="mt-2 text-xs leading-6 text-ocean-800/80">
                {locale === "en"
                  ? "Distinct governorates currently represented."
                  : "عدد المحافظات المختلفة الممثلة حالياً."}
              </p>
            </div>
          </div>
        </article>

        <article className="panel-surface-dark relative overflow-hidden p-5 sm:p-6">
          <div
            className={cn(
              "absolute top-0 h-32 w-32 rounded-full bg-ocean-400/25 blur-3xl",
              isRTL ? "-left-8" : "-right-8"
            )}
          />
          <div className="relative z-10">
            <p className="eyebrow-label text-slate-300">
              {locale === "en" ? "Network spotlight" : "أبرز منطقة"}
            </p>
            <h3 className="mt-3 text-xl font-extrabold text-white">
              {zoneHighlights.highestFeeZone
                ? locale === "en"
                  ? zoneHighlights.highestFeeZone.nameEn
                  : zoneHighlights.highestFeeZone.nameAr
                : locale === "en"
                  ? "No featured zone"
                  : "لا توجد منطقة مميزة"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {zoneHighlights.highestFeeZone
                ? locale === "en"
                  ? "This zone currently carries the highest delivery fee in your coverage network."
                  : "هذه المنطقة تحمل حالياً أعلى رسوم توصيل داخل شبكة التغطية."
                : locale === "en"
                  ? "Add zones to unlock richer coverage insights."
                  : "أضف مناطق لعرض مؤشرات تغطية أغنى."}
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/10 p-4">
                <p className="text-xs text-slate-300">
                  {locale === "en" ? "Highest delivery fee" : "أعلى رسوم توصيل"}
                </p>
                <p className="mt-2 text-2xl font-extrabold text-white">
                  {zoneHighlights.highestFeeZone
                    ? formatMoney(
                        zoneHighlights.highestFeeZone.deliveryFee,
                        locale,
                        currencyCode
                      )
                    : "--"}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/10 p-4">
                <p className="text-xs text-slate-300">
                  {locale === "en" ? "Slowest ETA" : "أطول وقت متوقع"}
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {zoneHighlights.slowestZone
                    ? `${formatNumber(
                        zoneHighlights.slowestZone.estimatedDeliveryMinutes,
                        locale
                      )} ${locale === "en" ? "min" : "دقيقة"}`
                    : "--"}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/10 p-4">
                <p className="text-xs text-slate-300">
                  {locale === "en" ? "Zones with polygons" : "المناطق ذات المضلعات"}
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {formatNumber(zoneStats.zonesWithPolygons, locale)}
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="panel-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {locale === "en" ? "Coverage controls" : "أدوات التحكم بالتغطية"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              {locale === "en"
                ? "Edit bilingual naming, delivery fee, ETA, governorate, and operational notes from structured zone cards designed for faster coverage review."
                : "عدّل الأسماء باللغتين ورسوم التوصيل والوقت المتوقع والمحافظة والملاحظات التشغيلية من بطاقات مناطق منظمة ومصممة لمراجعة التغطية بسرعة أكبر."}
            </p>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs leading-6 text-slate-600">
            {locale === "en"
              ? "Saving a zone updates the live backend immediately."
              : "حفظ أي منطقة يحدّث الباكيند المباشر فوراً."}
          </div>
        </div>
      </section>

      {zones.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No delivery zones yet" : "لا توجد مناطق توصيل بعد"}
          description={
            locale === "en"
              ? "The zones page is fully ready, but the delivery coverage catalog is still empty."
              : "صفحة المناطق أصبحت جاهزة بالكامل، لكن كتالوج تغطية التوصيل ما زال فارغاً."
          }
        />
      ) : (
        <ZonesTable
          zones={zones}
          savingIds={zoneMutationIds}
          onSave={saveZone}
          onDelete={deleteZone}
        />
      )}
    </div>
  );
}
