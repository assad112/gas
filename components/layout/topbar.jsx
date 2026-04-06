"use client";

import { Bell, Globe2, Menu, RefreshCcw } from "lucide-react";
import { usePathname } from "next/navigation";

import { useI18n } from "@/hooks/use-i18n";
import { useOrders } from "@/hooks/use-orders";
import { cn } from "@/lib/utils";

const pageMetaFallback = {
  ar: {
    pricing: {
      title: "المنتجات",
      subtitle: "إدارة المنتجات ورسوم التوصيل والتوفر التشغيلي"
    },
    zones: {
      title: "المناطق",
      subtitle: "إدارة نطاقات التوصيل ورسومها والوقت التشغيلي المتوقع"
    }
  },
  en: {
    pricing: {
      title: "Products",
      subtitle: "Manage products, delivery fees, and operational availability"
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
    <header className="panel-surface sticky top-3 z-20 overflow-hidden p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/90 to-transparent" />
      <div className="pointer-events-none absolute -right-10 top-1 h-24 w-24 rounded-full bg-brand-200/50 blur-2xl" />
      <div className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-ocean-200/40 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-700 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.65)] transition hover:border-brand-200 hover:text-brand-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <p className="eyebrow-label">{pageMeta.title}</p>
            <h1 className="mt-1 text-xl font-extrabold text-slate-900 lg:text-2xl">
              {pageMeta.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{pageMeta.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          <span
            className={cn(
              "glass-chip w-full justify-center sm:w-auto",
              connectionStatus === "connected"
                ? "border-ocean-100/80 bg-ocean-50/85 text-ocean-700"
                : "border-amber-100/80 bg-amber-50/85 text-amber-700"
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
            className="flex w-full items-center justify-center gap-1 rounded-[22px] border border-slate-200/80 bg-white/90 p-1.5 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.55)] sm:w-auto"
          >
            <button
              type="button"
              onClick={() => setLocale("ar")}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold transition",
                locale === "ar"
                  ? "bg-slate-900 text-white shadow-[0_10px_20px_-16px_rgba(15,23,42,0.85)]"
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
                  ? "bg-slate-900 text-white shadow-[0_10px_20px_-16px_rgba(15,23,42,0.85)]"
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
            className="relative flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-700 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.55)] transition hover:border-brand-200 hover:text-brand-700 sm:w-12"
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

          <div className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-slate-200/80 bg-white/90 px-3 py-2 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.55)] sm:w-auto sm:justify-start">
            <div className={cn(isRTL ? "text-right" : "text-left")}>
              <p className="text-sm font-semibold text-slate-900">
                {t("common.adminName")}
              </p>
              <p className="text-xs text-slate-500">{t("common.adminRole")}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1e293b)] font-bold text-white shadow-[0_18px_28px_-18px_rgba(15,23,42,0.8)]">
              {locale === "ar" ? "أ" : "A"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
