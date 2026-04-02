"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumnBig,
  ClipboardList,
  FlameKindling,
  LayoutDashboard,
  LogOut,
  Map,
  MapPinned,
  PackageSearch,
  Settings,
  Truck,
  UserSquare2,
  X
} from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const extraLabels = {
  ar: {
    pricing: "الأسعار",
    zones: "المناطق"
  },
  en: {
    pricing: "Pricing",
    zones: "Zones"
  }
};

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { t, locale, isRTL } = useI18n();

  const navigationItems = [
    {
      label: t("sidebar.dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard
    },
    {
      label: t("sidebar.orders"),
      href: "/orders",
      icon: ClipboardList
    },
    {
      label: t("sidebar.map"),
      href: "/map",
      icon: Map
    },
    {
      label: t("sidebar.drivers"),
      href: "/drivers",
      icon: Truck
    },
    {
      label: t("sidebar.users"),
      href: "/users",
      icon: UserSquare2
    },
    {
      label: t("sidebar.reports"),
      href: "/reports",
      icon: ChartColumnBig
    },
    {
      label:
        t("sidebar.pricing") === "sidebar.pricing"
          ? extraLabels[locale].pricing
          : t("sidebar.pricing"),
      href: "/pricing",
      icon: PackageSearch
    },
    {
      label:
        t("sidebar.zones") === "sidebar.zones"
          ? extraLabels[locale].zones
          : t("sidebar.zones"),
      href: "/zones",
      icon: MapPinned
    },
    {
      label: t("sidebar.settings"),
      href: "/settings",
      icon: Settings
    }
  ];

  return (
    <>
      <button
        type="button"
        aria-label={t("sidebar.closeSidebar")}
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-4 start-4 z-40 flex w-[calc(100%-2rem)] max-w-[320px] flex-col rounded-[32px] border border-slate-800/60 bg-slate-950 p-5 text-white shadow-panel transition-transform duration-300 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[320px] lg:translate-x-0",
          open
            ? "translate-x-0"
            : isRTL
              ? "translate-x-[115%] lg:translate-x-0"
              : "-translate-x-[115%] lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <FlameKindling className="h-7 w-7" />
          </div>

          <div>
            <p className="eyebrow-label text-slate-400">
              {t("sidebar.brandEyebrow")}
            </p>
            <h2 className="mt-1 text-xl font-extrabold">{t("sidebar.brandName")}</h2>
          </div>
        </div>

        <div className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">
            {t("sidebar.executiveBoard")}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {t("sidebar.executiveDescription")}
          </p>
        </div>

        <nav className="mt-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center justify-between rounded-[22px] border px-4 py-3 transition duration-200",
                  isActive
                    ? "border-brand-400/40 bg-brand-500/15 text-white"
                    : "border-transparent bg-white/[0.04] text-slate-300 hover:border-white/10 hover:bg-white/[0.08] hover:text-white"
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-2xl transition",
                      isActive
                        ? "bg-brand-500 text-white"
                        : "bg-white/5 text-slate-300 group-hover:bg-white/10 group-hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[26px] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4">
          <p className="text-sm font-semibold text-white">{t("sidebar.session")}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 font-bold text-brand-200">
              {locale === "ar" ? "أ" : "A"}
            </div>
            <div className={cn(isRTL ? "text-right" : "text-left")}>
              <p className="font-semibold text-white">{t("sidebar.manager")}</p>
              <p className="text-xs text-slate-400">admin@omangas.local</p>
            </div>
          </div>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            {t("sidebar.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
