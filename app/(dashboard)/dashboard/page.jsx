"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  ChartColumnBig,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPinned,
  PackageSearch,
  RefreshCcw,
  ShieldCheck,
  Truck,
  Users2,
  XCircle
} from "lucide-react";

import DriversOverviewCard from "@/components/dashboard/drivers-overview-card";
import LiveOrderCard from "@/components/dashboard/live-order-card";
import RecentOrdersCard from "@/components/dashboard/recent-orders-card";
import StatsCard from "@/components/dashboard/stats-card";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function ExecutiveTile({ icon: Icon, title, value, helper }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/10 p-4 shadow-[0_24px_40px_-30px_rgba(2,6,23,0.48)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            {title}
          </p>
          <p className="mt-3 text-xl font-extrabold text-white">{value}</p>
          <p className="mt-2 text-xs leading-6 text-slate-300">{helper}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-white/12 text-white ring-1 ring-white/10">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  metric,
  metricLabel,
  tone = "slate"
}) {
  const toneClasses = {
    slate: "border-slate-200 bg-white text-slate-900",
    brand: "border-brand-100 bg-brand-50/70 text-brand-950",
    ocean: "border-ocean-100 bg-ocean-50/75 text-ocean-950",
    emerald: "border-emerald-100 bg-emerald-50/75 text-emerald-950"
  };

  return (
    <Link
      href={href}
      className={cn(
        "group rounded-[26px] border p-4 shadow-[0_24px_38px_-34px_rgba(15,23,42,0.22)] transition hover:-translate-y-1 hover:shadow-[0_28px_48px_-30px_rgba(15,23,42,0.28)]",
        toneClasses[tone] || toneClasses.slate
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/80 shadow-sm ring-1 ring-white/70">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-700" />
      </div>
      <div className="mt-4">
        <h3 className="text-base font-extrabold">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
      </div>
      <div className="mt-4 rounded-[20px] border border-white/60 bg-white/75 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {metricLabel}
        </p>
        <p className="mt-2 text-lg font-extrabold text-slate-950">{metric}</p>
      </div>
    </Link>
  );
}

function ReadinessMeter({ label, value, hint, tone = "brand" }) {
  const toneClasses = {
    brand: "bg-brand-500",
    ocean: "bg-ocean-500",
    emerald: "bg-emerald-500",
    slate: "bg-slate-700"
  };

  return (
    <div className="rounded-[24px] border border-slate-100 bg-white/85 p-4 shadow-[0_20px_36px_-34px_rgba(15,23,42,0.2)]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-sm font-extrabold text-slate-950">{value}%</p>
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-slate-100">
        <div
          className={cn(
            "h-2.5 rounded-full transition-all",
            toneClasses[tone] || toneClasses.brand
          )}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <p className="mt-3 text-xs leading-6 text-slate-500">{hint}</p>
    </div>
  );
}

export default function DashboardPage() {
  const {
    orders,
    drivers,
    settings,
    products,
    zones,
    latestIncomingOrder,
    dismissLatestAlert,
    stats,
    operationalSnapshot,
    connectionStatus,
    resources,
    refreshAdminData
  } = useAdmin();
  const { t, isRTL, locale } = useI18n();

  const currencyCode = settings?.currencyCode || "OMR";
  const featuredProduct = products.find((product) => product.isAvailable) || products[0] || null;
  const availableProducts = products.filter((product) => product.isAvailable).length;
  const activeZones = zones.filter((zone) => zone.isActive).length;
  const zonesWithPolygons = zones.filter(
    (zone) => Array.isArray(zone.polygon) && zone.polygon.length >= 3
  ).length;
  const busyDrivers = drivers.filter(
    (driver) => driver.status === "online" && driver.availability === "busy"
  ).length;
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const fleetReadiness =
    drivers.length > 0
      ? Math.round((operationalSnapshot.availableDrivers / drivers.length) * 100)
      : 0;
  const coverageReadiness =
    zones.length > 0
      ? Math.round((zonesWithPolygons / zones.length) * 100)
      : 0;
  const catalogReadiness =
    products.length > 0
      ? Math.round((availableProducts / products.length) * 100)
      : 0;

  const statCards = [
    {
      title: locale === "en" ? "Total Orders" : "إجمالي الطلبات",
      value: stats.total,
      subtitle:
        locale === "en"
          ? "All real orders currently recorded in the backend."
          : "جميع الطلبات الحقيقية المسجلة حالياً في الباكيند.",
      icon: ClipboardList,
      tone: "amber"
    },
    {
      title: locale === "en" ? "New Orders" : "الطلبات الجديدة",
      value: stats.newOrders,
      subtitle:
        locale === "en"
          ? "Pending orders waiting for immediate operational action."
          : "طلبات معلقة تنتظر إجراءً سريعاً من فريق التشغيل.",
      icon: BellRing,
      tone: "rose"
    },
    {
      title: locale === "en" ? "Active Orders" : "الطلبات النشطة",
      value: stats.active,
      subtitle:
        locale === "en"
          ? "Accepted orders currently in live execution."
          : "طلبات مقبولة يجري تنفيذها الآن بشكل مباشر.",
      icon: Truck,
      tone: "sky"
    },
    {
      title: locale === "en" ? "Completed Orders" : "الطلبات المكتملة",
      value: stats.completed,
      subtitle:
        locale === "en"
          ? "Delivered orders completed successfully."
          : "طلبات تم تسليمها بنجاح وإغلاقها تشغيلياً.",
      icon: CheckCircle2,
      tone: "emerald"
    },
    {
      title: locale === "en" ? "Cancelled Orders" : "الطلبات الملغاة",
      value: stats.cancelled,
      subtitle:
        locale === "en"
          ? "Orders cancelled before delivery handoff."
          : "طلبات أُلغيت قبل اكتمال التسليم.",
      icon: XCircle,
      tone: "slate"
    },
    {
      title: locale === "en" ? "Available Drivers" : "السائقون المتاحون",
      value: operationalSnapshot.availableDrivers,
      subtitle:
        locale === "en"
          ? "Drivers ready to accept the next dispatch."
          : "السائقون الجاهزون لاستقبال التوجيه التالي.",
      icon: Users2,
      tone: "teal"
    }
  ];

  const quickActions = [
    {
      href: "/orders",
      icon: ClipboardList,
      title: locale === "en" ? "Orders desk" : "مكتب الطلبات",
      description:
        locale === "en"
          ? "Review pending demand, assign drivers, and close active fulfillment tasks."
          : "راجع الطلبات المعلقة ونسق التوزيع وأغلق مهام التنفيذ النشطة.",
      metric: formatNumber(stats.newOrders, locale),
      metricLabel: locale === "en" ? "Pending now" : "المعلق الآن",
      tone: "brand"
    },
    {
      href: "/drivers",
      icon: Truck,
      title: locale === "en" ? "Fleet desk" : "مكتب الأسطول",
      description:
        locale === "en"
          ? "Check driver readiness, active trips, and operator availability."
          : "افحص جاهزية السائقين والرحلات الحالية وحالة التوفر التشغيلي.",
      metric: formatNumber(operationalSnapshot.availableDrivers, locale),
      metricLabel: locale === "en" ? "Ready drivers" : "السائقون الجاهزون",
      tone: "ocean"
    },
    {
      href: "/map",
      icon: MapPinned,
      title: locale === "en" ? "Map workspace" : "مساحة الخريطة",
      description:
        locale === "en"
          ? "Monitor live coverage, route visibility, and polygon readiness from one map view."
          : "راقب التغطية الحية والمسارات وجاهزية المضلعات من خريطة واحدة.",
      metric: `${formatNumber(zonesWithPolygons, locale)} / ${formatNumber(zones.length, locale)}`,
      metricLabel: locale === "en" ? "Polygons ready" : "المضلعات الجاهزة",
      tone: "emerald"
    },
    {
      href: "/pricing",
      icon: PackageSearch,
      title: locale === "en" ? "Catalog desk" : "مكتب المنتجات",
      description:
        locale === "en"
          ? "Keep cylinder pricing, delivery fees, and catalog visibility aligned with operations."
          : "حافظ على أسعار المنتجات ورسوم التوصيل وظهور الكتالوج بشكل منظم.",
      metric: formatNumber(availableProducts, locale),
      metricLabel: locale === "en" ? "Visible products" : "المنتجات الظاهرة",
      tone: "brand"
    },
    {
      href: "/zones",
      icon: ShieldCheck,
      title: locale === "en" ? "Coverage desk" : "مكتب المناطق",
      description:
        locale === "en"
          ? "Adjust zone fees, ETA, and activation state across the delivery network."
          : "عدّل رسوم المناطق ووقت التوصيل وحالة التفعيل عبر شبكة التوصيل.",
      metric: formatNumber(activeZones, locale),
      metricLabel: locale === "en" ? "Active zones" : "المناطق النشطة",
      tone: "ocean"
    },
    {
      href: "/reports",
      icon: ChartColumnBig,
      title: locale === "en" ? "Reports desk" : "مكتب التقارير",
      description:
        locale === "en"
          ? "Follow fulfillment trends, completion flow, and operating output."
          : "تابع اتجاهات التنفيذ ومعدلات الإكمال ومخرجات التشغيل.",
      metric: `${formatNumber(completionRate, locale)}%`,
      metricLabel: locale === "en" ? "Completion rate" : "معدل الإكمال",
      tone: "slate"
    }
  ];

  if (resources.orders.loading && orders.length === 0) {
    return <LoadingSpinner label={t("common.loading")} />;
  }

  if (resources.orders.error && orders.length === 0) {
    return (
      <ErrorState
        title={locale === "en" ? "Orders feed unavailable" : "تعذر الوصول إلى الطلبات"}
        description={resources.orders.error}
        actionLabel={locale === "en" ? "Refresh dashboard" : "تحديث الداشبورد"}
        onAction={() => refreshAdminData()}
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
              ? "right-0 bg-gradient-to-l from-brand-500/20 to-transparent"
              : "left-0 bg-gradient-to-r from-brand-500/20 to-transparent"
          )}
        />
        <div
          className={cn(
            "absolute top-8 h-40 w-40 rounded-full bg-ocean-300/20 blur-3xl",
            isRTL ? "-left-16" : "-right-16"
          )}
        />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-100">
              {settings?.systemName || t("sidebar.brandName")}
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  connectionStatus === "connected" ? "bg-ocean-300" : "bg-amber-300"
                )}
              />
            </span>

            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold leading-tight text-white lg:text-4xl">
                {locale === "en"
                  ? "A cleaner operational command center for live orders, fleet, coverage, and catalog control"
                  : "مركز تشغيل أكثر احترافية ووضوحاً لإدارة الطلبات والأسطول والتغطية والكتالوج بشكل مباشر"}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 lg:text-base">
                {settings?.systemMessage ||
                  (locale === "en"
                    ? "This dashboard is organized around real operational priorities: demand intake, fleet readiness, coverage visibility, and fast access to the tools that matter every day."
                    : "تم تنظيم هذه الصفحة حول الأولويات التشغيلية الحقيقية: استقبال الطلب، جاهزية الأسطول، وضوح التغطية، والوصول السريع إلى الأدوات التي تحتاجها يومياً.")}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[470px]">
            <ExecutiveTile
              icon={Truck}
              title={locale === "en" ? "Available drivers" : "السائقون المتاحون"}
              value={formatNumber(operationalSnapshot.availableDrivers, locale)}
              helper={
                locale === "en"
                  ? "Ready to receive the next dispatch immediately."
                  : "جاهزون لاستقبال مهمة التوصيل التالية مباشرة."
              }
            />
            <ExecutiveTile
              icon={MapPinned}
              title={locale === "en" ? "Active zones" : "المناطق النشطة"}
              value={formatNumber(activeZones, locale)}
              helper={
                locale === "en"
                  ? "Live coverage areas currently open for delivery."
                  : "مناطق التغطية المفتوحة حالياً للتوصيل."
              }
            />
            <ExecutiveTile
              icon={PackageSearch}
              title={locale === "en" ? "Visible products" : "المنتجات الظاهرة"}
              value={formatNumber(availableProducts, locale)}
              helper={
                locale === "en"
                  ? "Cylinder catalog items available to operations now."
                  : "منتجات الكتالوج المتاحة حالياً للتشغيل."
              }
            />
            <ExecutiveTile
              icon={Clock3}
              title={locale === "en" ? "Default delivery fee" : "رسوم التوصيل الافتراضية"}
              value={formatMoney(settings?.defaultDeliveryFee || 0, locale, currencyCode)}
              helper={
                featuredProduct
                  ? locale === "en"
                    ? `${featuredProduct.nameEn} is currently the lead commercial product.`
                    : `${featuredProduct.nameAr} هو المنتج التجاري الأبرز حالياً.`
                  : locale === "en"
                    ? "No featured product is configured yet."
                    : "لا يوجد منتج مميز مضبوط بعد."
              }
            />
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm",
              connectionStatus === "connected"
                ? "border-ocean-100/30 bg-ocean-400/10 text-ocean-100"
                : "border-amber-100/30 bg-amber-400/10 text-amber-100"
            )}
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                connectionStatus === "connected" ? "bg-ocean-300" : "bg-amber-300"
              )}
            />
            {connectionStatus === "connected"
              ? locale === "en"
                ? "Live backend connected"
                : "اتصال مباشر بالباكيند"
              : locale === "en"
                ? "Reconnecting to live backend"
                : "جاري إعادة الاتصال بالباكيند"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
            {locale === "en" ? "Customers" : "العملاء"}:
            <strong className="text-white">
              {formatNumber(operationalSnapshot.totalCustomers, locale)}
            </strong>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
            {locale === "en" ? "Online drivers" : "السائقون المتصلون"}:
            <strong className="text-white">
              {formatNumber(operationalSnapshot.onlineDrivers, locale)}
            </strong>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200">
            {locale === "en" ? "Polygon-ready zones" : "المناطق ذات المضلعات الجاهزة"}:
            <strong className="text-white">
              {formatNumber(zonesWithPolygons, locale)}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => refreshAdminData({ silent: true })}
            disabled={Object.values(resources).some((resource) => resource.refreshing)}
            className="button-secondary border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white"
          >
            <RefreshCcw
              className={cn(
                "h-4 w-4",
                Object.values(resources).some((resource) => resource.refreshing) &&
                  "animate-spin"
              )}
            />
            {locale === "en" ? "Refresh workspace" : "تحديث مساحة العمل"}
          </button>
        </div>
      </section>

      {latestIncomingOrder ? (
        <LiveOrderCard order={latestIncomingOrder} onDismiss={dismissLatestAlert} />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {statCards.map((card) => (
          <StatsCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <article className="panel-surface overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] p-6">
            <p className="eyebrow-label">
              {locale === "en" ? "Operations desk" : "مكتب التشغيل"}
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
              {locale === "en"
                ? "Everything the team needs, arranged around real daily workflows"
                : "كل ما يحتاجه الفريق مرتب حول مهام التشغيل اليومية الحقيقية"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              {locale === "en"
                ? "Jump directly into the right workspace for orders, fleet, map coverage, catalog control, delivery zones, and reports without hunting across the dashboard."
                : "انتقل مباشرة إلى مساحة العمل المناسبة للطلبات والأسطول والخريطة والمنتجات والمناطق والتقارير بدون البحث بين أقسام اللوحة."}
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <QuickActionCard key={action.href} {...action} />
            ))}
          </div>
        </article>

        <article className="panel-surface overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] p-6">
            <p className="eyebrow-label">
              {locale === "en" ? "Readiness board" : "لوحة الجاهزية"}
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
              {locale === "en"
                ? "A quick read on whether operations can absorb demand right now"
                : "قراءة سريعة لمدى جاهزية التشغيل لاستيعاب الطلب الحالي"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {locale === "en"
                ? "These signals summarize fulfillment health, fleet availability, map coverage readiness, and catalog visibility in one focused panel."
                : "تلخص هذه المؤشرات صحة التنفيذ وجاهزية الأسطول والتغطية الجغرافية ووضوح الكتالوج داخل لوحة مركزة واحدة."}
            </p>
          </div>

          <div className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadinessMeter
                label={locale === "en" ? "Completion flow" : "تدفق الإكمال"}
                value={completionRate}
                hint={
                  locale === "en"
                    ? "Delivered orders as a share of total recorded orders."
                    : "نسبة الطلبات المكتملة إلى إجمالي الطلبات المسجلة."
                }
                tone="emerald"
              />
              <ReadinessMeter
                label={locale === "en" ? "Fleet readiness" : "جاهزية الأسطول"}
                value={fleetReadiness}
                hint={
                  locale === "en"
                    ? "Available drivers compared with total fleet records."
                    : "السائقون المتاحون مقارنة بإجمالي سجلات الأسطول."
                }
                tone="ocean"
              />
              <ReadinessMeter
                label={locale === "en" ? "Coverage readiness" : "جاهزية التغطية"}
                value={coverageReadiness}
                hint={
                  locale === "en"
                    ? "Zones that already have polygon geometry configured."
                    : "المناطق التي تملك مضلعات جغرافية جاهزة بالفعل."
                }
                tone="brand"
              />
              <ReadinessMeter
                label={locale === "en" ? "Catalog readiness" : "جاهزية الكتالوج"}
                value={catalogReadiness}
                hint={
                  locale === "en"
                    ? "Visible products compared with the full catalog set."
                    : "المنتجات الظاهرة مقارنة بإجمالي الكتالوج."
                }
                tone="slate"
              />
            </div>

            <div className="rounded-[28px] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.94))] p-5 shadow-[0_24px_40px_-36px_rgba(15,23,42,0.18)]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {locale === "en" ? "Current network signal" : "إشارة الشبكة الحالية"}
                  </p>
                  <h3 className="mt-3 text-lg font-extrabold text-slate-950">
                    {stats.newOrders > operationalSnapshot.availableDrivers &&
                    stats.newOrders > 0
                      ? locale === "en"
                        ? "Pending demand is rising faster than immediate fleet capacity"
                        : "الطلب المعلق يرتفع بسرعة أكبر من السعة الفورية للأسطول"
                      : locale === "en"
                        ? "The operating network looks balanced for the current order volume"
                        : "شبكة التشغيل تبدو متوازنة مع حجم الطلب الحالي"}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {locale === "en"
                      ? `${formatNumber(stats.newOrders, locale)} pending orders, ${formatNumber(
                          operationalSnapshot.availableDrivers,
                          locale
                        )} available drivers, and ${formatNumber(
                          busyDrivers,
                          locale
                        )} busy drivers are shaping dispatch priority right now.`
                      : `${formatNumber(stats.newOrders, locale)} طلبات معلقة، و${formatNumber(
                          operationalSnapshot.availableDrivers,
                          locale
                        )} سائقين متاحين، و${formatNumber(
                          busyDrivers,
                          locale
                        )} سائقين مشغولين تشكل أولوية التوزيع الحالية.`}
                  </p>
                </div>

                <div className="grid min-w-[220px] gap-3">
                  <div className="rounded-[22px] border border-slate-100 bg-white/85 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {locale === "en" ? "Lead product" : "المنتج الأبرز"}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-950">
                      {featuredProduct
                        ? locale === "en"
                          ? featuredProduct.nameEn
                          : featuredProduct.nameAr
                        : locale === "en"
                          ? "Not configured yet"
                          : "غير مضبوط بعد"}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-slate-100 bg-white/85 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {locale === "en" ? "Default fee" : "الرسوم الافتراضية"}
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-950">
                      {formatMoney(settings?.defaultDeliveryFee || 0, locale, currencyCode)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <RecentOrdersCard
          orders={orders.slice(0, 6)}
          stats={stats}
          currencyCode={currencyCode}
        />
        <DriversOverviewCard
          drivers={drivers}
          operationalSnapshot={operationalSnapshot}
        />
      </section>
    </div>
  );
}
