"use client";

import {
  BellRing,
  CheckCircle2,
  ClipboardList,
  Truck,
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

export default function DashboardPage() {
  const {
    orders,
    drivers,
    settings,
    products,
    latestIncomingOrder,
    dismissLatestAlert,
    stats,
    operationalSnapshot,
    connectionStatus,
    resources,
    refreshAdminData
  } = useAdmin();
  const { t, isRTL, locale } = useI18n();

  const featuredProduct = products[0] || null;
  const currencyCode = settings?.currencyCode || "OMR";

  const statCards = [
    {
      title: locale === "en" ? "Total Orders" : "إجمالي الطلبات",
      value: stats.total,
      subtitle:
        locale === "en"
          ? "All real orders currently recorded in the backend."
          : "جميع الطلبات الحقيقية المسجلة حاليًا في النظام.",
      icon: ClipboardList,
      tone: "amber"
    },
    {
      title: locale === "en" ? "New Orders" : "الطلبات الجديدة",
      value: stats.newOrders,
      subtitle:
        locale === "en"
          ? "Pending orders waiting for operational action."
          : "الطلبات المعلقة التي تنتظر إجراءً من فريق التشغيل.",
      icon: BellRing,
      tone: "rose"
    },
    {
      title: locale === "en" ? "Active Orders" : "الطلبات النشطة",
      value: stats.active,
      subtitle:
        locale === "en"
          ? "Accepted orders currently in execution."
          : "الطلبات المقبولة والتي يجري تنفيذها الآن.",
      icon: Truck,
      tone: "sky"
    },
    {
      title: locale === "en" ? "Completed Orders" : "الطلبات المكتملة",
      value: stats.completed,
      subtitle:
        locale === "en"
          ? "Delivered orders completed successfully."
          : "الطلبات التي اكتمل تسليمها بنجاح.",
      icon: CheckCircle2,
      tone: "emerald"
    },
    {
      title: locale === "en" ? "Cancelled Orders" : "الطلبات الملغاة",
      value: stats.cancelled,
      subtitle:
        locale === "en"
          ? "Orders cancelled before delivery."
          : "الطلبات التي ألغيت قبل التسليم.",
      icon: XCircle,
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
        actionLabel={t("common.update")}
        onAction={() => refreshAdminData()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface-dark relative overflow-hidden p-6 lg:p-8">
        <div
          className={`absolute inset-y-0 w-40 ${
            isRTL
              ? "right-0 bg-gradient-to-l from-brand-500/20 to-transparent"
              : "left-0 bg-gradient-to-r from-brand-500/20 to-transparent"
          }`}
        />
        <div
          className={`absolute top-10 h-36 w-36 rounded-full bg-brand-400/20 blur-3xl ${
            isRTL ? "-right-14" : "-left-14"
          }`}
        />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-100">
              {settings?.systemName || t("sidebar.brandName")}
              <span className="h-2.5 w-2.5 rounded-full bg-ocean-300" />
            </span>

            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold leading-tight text-white lg:text-4xl">
                {locale === "en"
                  ? "Operational control center built on live backend data"
                  : "مركز تشغيل حقيقي مبني على بيانات مباشرة من الـ backend"}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 lg:text-base">
                {settings?.systemMessage ||
                  (locale === "en"
                    ? "Orders, pricing, customers, and fleet readiness now reflect the current operating state instead of demo content."
                    : "الطلبات والتسعير والعملاء وحالة الأسطول أصبحت الآن تعكس التشغيل الفعلي بدل المحتوى التجريبي.")}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-sm text-slate-300">
                {locale === "en" ? "Featured Cylinder" : "الأسطوانة الأساسية"}
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {featuredProduct
                  ? locale === "en"
                    ? featuredProduct.nameEn
                    : featuredProduct.nameAr
                  : locale === "en"
                    ? "Not configured"
                    : "غير مهيأة"}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {featuredProduct
                  ? formatMoney(featuredProduct.price, locale, currencyCode)
                  : "--"}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-sm text-slate-300">
                {locale === "en" ? "Default Delivery Fee" : "رسوم التوصيل الافتراضية"}
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {formatMoney(
                  settings?.defaultDeliveryFee || 0,
                  locale,
                  currencyCode
                )}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-sm text-slate-300">
                {locale === "en" ? "Available Drivers" : "السائقون المتاحون"}
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {formatNumber(operationalSnapshot.availableDrivers, locale)}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2">
            {t("dashboard.connectionStatus")}:
            <strong className="text-white">
              {connectionStatus === "connected"
                ? t("common.live")
                : t("common.waitingConnection")}
            </strong>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2">
            {locale === "en" ? "Customers" : "العملاء"}:
            <strong className="text-white">
              {formatNumber(operationalSnapshot.totalCustomers, locale)}
            </strong>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2">
            {locale === "en" ? "Drivers online" : "السائقون المتصلون"}:
            <strong className="text-white">
              {formatNumber(operationalSnapshot.onlineDrivers, locale)}
            </strong>
          </span>
        </div>
      </section>

      {latestIncomingOrder ? (
        <LiveOrderCard order={latestIncomingOrder} onDismiss={dismissLatestAlert} />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {statCards.map((card) => (
          <StatsCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <RecentOrdersCard orders={orders.slice(0, 6)} />
        <DriversOverviewCard drivers={drivers} />
      </section>
    </div>
  );
}
