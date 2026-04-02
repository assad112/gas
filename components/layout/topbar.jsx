"use client";

import { Bell, Globe2, Menu, RefreshCcw } from "lucide-react";
import { usePathname } from "next/navigation";

import { useI18n } from "@/hooks/use-i18n";
import { useOrders } from "@/hooks/use-orders";
import { cn } from "@/lib/utils";

const pageMetaFallback = {
  ar: {
    pricing: {
      title: "الأسعار",
      subtitle: "إدارة أسعار الأسطوانات ورسوم التوصيل وتوفر المنتجات"
    },
    zones: {
      title: "المناطق",
      subtitle: "إدارة نطاقات التوصيل ورسومها والوقت التشغيلي المتوقع"
    }
  },
  en: {
    pricing: {
      title: "Pricing",
      subtitle: "Manage cylinder pricing, delivery fees, and product availability"
    },
    zones: {
      title: "Zones",
      subtitle: "Manage delivery coverage zones, fees, and operational timing"
    }
  }
};

export default function Topbar({ onOpenSidebar }) {
  const pathname = usePathname();
  const { t, locale, setLocale, isRTL } = useI18n();
  const { refreshAdminData, isRefreshing, latestIncomingOrder, connectionStatus } =
    useOrders();

  const pageKey = pathname.replace("/", "") || "dashboard";
  const resolvedMeta =
    t(`pageMeta.${pageKey}`) === `pageMeta.${pageKey}`
      ? pageMetaFallback[locale]?.[pageKey]
      : t(`pageMeta.${pageKey}`);
  const pageMeta =
    resolvedMeta || t("pageMeta.dashboard") || pageMetaFallback[locale].dashboard;

  return (
    <header className="panel-surface sticky top-4 z-20 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-700 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <p className="eyebrow-label">
            {pageMeta.title}
          </p>
          <h1 className="mt-1 text-xl font-extrabold text-slate-900 lg:text-2xl">
            {pageMeta.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{pageMeta.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-3">
        <span
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold sm:w-auto",
            connectionStatus === "connected"
              ? "bg-ocean-50 text-ocean-700"
              : "bg-amber-50 text-amber-700"
          )}
        >
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              connectionStatus === "connected"
                ? "bg-ocean-500"
                : "bg-amber-500"
            )}
          />
          {connectionStatus === "connected"
            ? t("common.connected")
            : t("common.reconnecting")}
        </span>

        <div
          aria-label={t("language.label")}
          className="flex w-full items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto"
        >
          <button
            type="button"
            onClick={() => setLocale("ar")}
            className={cn(
              "rounded-xl px-3 py-2 text-xs font-semibold transition",
              locale === "ar"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100"
            )}
          >
            {t("language.arabic")}
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              "rounded-xl px-3 py-2 text-xs font-semibold transition",
              locale === "en"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100"
            )}
          >
            {t("language.english")}
          </button>
          <span className="hidden px-1 text-slate-300 sm:inline-flex">
            <Globe2 className="h-4 w-4" />
          </span>
        </div>

        <button
          type="button"
          onClick={() => refreshAdminData({ silent: true })}
          disabled={isRefreshing}
          className="button-secondary w-full sm:w-auto"
        >
          <RefreshCcw
            className={cn("h-4 w-4", isRefreshing && "animate-spin")}
          />
          {t("common.update")}
        </button>

        <button
          type="button"
          className="relative flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-brand-200 hover:text-brand-700 sm:w-12"
        >
          <Bell className="h-5 w-5" />
          {latestIncomingOrder ? (
            <span
              className={cn(
                "absolute top-2 h-2.5 w-2.5 rounded-full bg-brand-500",
                isRTL ? "left-2" : "right-2"
              )}
            />
          ) : null}
        </button>

        <div className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white px-3 py-2 sm:w-auto sm:justify-start">
          <div className={cn(isRTL ? "text-right" : "text-left")}>
            <p className="text-sm font-semibold text-slate-900">
              {t("common.adminName")}
            </p>
            <p className="text-xs text-slate-500">{t("common.adminRole")}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 font-bold text-white">
            {locale === "ar" ? "أ" : "A"}
          </div>
        </div>
      </div>
    </header>
  );
}
