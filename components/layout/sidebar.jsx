"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bug,
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

const fallbackLabels = {
  ar: {
    pricing: "المنتجات",
    zones: "المناطق",
    errors: "الأخطاء",
    navigation: "التنقل",
    controlMenu: "قائمة التحكم"
  },
  en: {
    pricing: "Products",
    zones: "Zones",
    errors: "Errors",
    navigation: "Navigation",
    controlMenu: "Control Menu"
  }
};

const toneStyles = {
  slate: {
    active:
      "border-white/12 bg-[linear-gradient(135deg,rgba(148,163,184,0.16),rgba(255,255,255,0.08))] text-white shadow-[0_24px_44px_-34px_rgba(15,23,42,0.54)]",
    icon: "bg-white/14 text-white ring-1 ring-white/10",
    dot: "bg-white/70"
  },
  ocean: {
    active:
      "border-ocean-300/40 bg-[linear-gradient(135deg,rgba(23,173,143,0.2),rgba(255,255,255,0.08))] text-white shadow-[0_24px_44px_-32px_rgba(23,173,143,0.5)]",
    icon: "bg-white/14 text-ocean-100 ring-1 ring-ocean-300/15",
    dot: "bg-ocean-300"
  },
  amber: {
    active:
      "border-brand-300/45 bg-[linear-gradient(135deg,rgba(255,124,31,0.2),rgba(255,255,255,0.08))] text-white shadow-[0_24px_44px_-32px_rgba(255,124,31,0.58)]",
    icon: "bg-white/14 text-brand-100 ring-1 ring-brand-300/15",
    dot: "bg-brand-300"
  },
  emerald: {
    active:
      "border-emerald-300/40 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(255,255,255,0.08))] text-white shadow-[0_24px_44px_-32px_rgba(16,185,129,0.46)]",
    icon: "bg-white/14 text-emerald-100 ring-1 ring-emerald-300/15",
    dot: "bg-emerald-300"
  },
  danger: {
    active:
      "border-amber-400/60 bg-[linear-gradient(135deg,rgba(120,53,15,0.62),rgba(51,65,85,0.14))] text-white shadow-[0_24px_44px_-32px_rgba(251,146,60,0.72)]",
    icon: "bg-white/14 text-amber-100 ring-1 ring-amber-300/20",
    dot: "bg-amber-300"
  }
};

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { t, locale, isRTL } = useI18n();
  const labels = fallbackLabels[locale] || fallbackLabels.en;

  const navigationItems = [
    {
      label: t("sidebar.dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      tone: "slate"
    },
    {
      label: t("sidebar.orders"),
      href: "/orders",
      icon: ClipboardList,
      tone: "slate"
    },
    {
      label: t("sidebar.map"),
      href: "/map",
      icon: Map,
      tone: "ocean"
    },
    {
      label: t("sidebar.drivers"),
      href: "/drivers",
      icon: Truck,
      tone: "ocean"
    },
    {
      label: t("sidebar.users"),
      href: "/users",
      icon: UserSquare2,
      tone: "slate"
    },
    {
      label: t("sidebar.reports"),
      href: "/reports",
      icon: ChartColumnBig,
      tone: "slate"
    },
    {
      label: labels.errors,
      href: "/errors",
      icon: Bug,
      tone: "danger"
    },
    {
      label:
        t("sidebar.pricing") === "sidebar.pricing"
          ? labels.pricing
          : t("sidebar.pricing"),
      href: "/pricing",
      icon: PackageSearch,
      tone: "amber"
    },
    {
      label:
        t("sidebar.zones") === "sidebar.zones" ? labels.zones : t("sidebar.zones"),
      href: "/zones",
      icon: MapPinned,
      tone: "emerald"
    },
    {
      label: t("sidebar.settings"),
      href: "/settings",
      icon: Settings,
      tone: "slate"
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
          "fixed inset-y-4 start-4 z-40 flex w-[calc(100%-2rem)] max-w-[332px] flex-col overflow-hidden rounded-[34px] border border-slate-800/60 bg-slate-950 p-5 text-white shadow-panel transition-transform duration-300 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[332px] lg:translate-x-0",
          open
            ? "translate-x-0"
            : isRTL
              ? "translate-x-[115%] lg:translate-x-0"
              : "-translate-x-[115%] lg:translate-x-0"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
        <div className="pointer-events-none absolute -right-16 top-20 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-16 h-32 w-32 rounded-full bg-ocean-400/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />

        <div className="flex items-center justify-between lg:hidden">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            {labels.navigation}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cn(
            "relative mt-2 flex items-center gap-4",
            isRTL && "flex-row-reverse"
          )}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-brand-300 via-brand-500 to-brand-700 shadow-glow ring-1 ring-white/10">
            <FlameKindling className="h-7 w-7" />
          </div>

          <div className={cn("min-w-0 flex-1", isRTL ? "text-right" : "text-left")}>
            <p className="eyebrow-label text-slate-500">{t("sidebar.brandEyebrow")}</p>
            <h2 className="mt-1 truncate text-2xl font-extrabold text-white">
              {t("sidebar.brandName")}
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.65)]">
          <p className={cn("text-sm font-semibold text-white", isRTL ? "text-right" : "text-left")}>
            {t("sidebar.executiveBoard")}
          </p>
          <p
            className={cn(
              "mt-2 text-sm leading-7 text-slate-400",
              isRTL ? "text-right" : "text-left"
            )}
          >
            {t("sidebar.executiveDescription")}
          </p>
        </div>

        <div className="mt-6 flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "mb-3 px-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500",
              isRTL && "text-right"
            )}
          >
            {labels.controlMenu}
          </div>

          <nav className="min-h-0 flex-1 space-y-3 overflow-y-auto pe-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const tone = toneStyles[item.tone] || toneStyles.slate;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group relative block overflow-hidden rounded-[28px] border px-4 py-4 transition duration-200",
                    isActive
                      ? tone.active
                      : "border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.07] hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "absolute start-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition",
                      isActive ? tone.dot : "bg-transparent group-hover:bg-white/20"
                    )}
                  />

                  <span
                    className={cn(
                      "flex items-center justify-between gap-3",
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1",
                        isRTL ? "text-right" : "text-left"
                      )}
                    >
                      <span className="block truncate text-sm font-bold">
                        {item.label}
                      </span>
                    </span>

                    <span
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] transition",
                        isActive
                          ? tone.icon
                          : "bg-white/[0.06] text-slate-300 ring-1 ring-white/5 group-hover:bg-white/[0.11] group-hover:text-white"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-5 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4 shadow-[0_24px_40px_-32px_rgba(15,23,42,0.7)]">
          <div
            className={cn(
              "flex items-start gap-3",
              isRTL && "flex-row-reverse"
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white/10 font-bold text-brand-200 ring-1 ring-white/10">
              {locale === "ar" ? "أ" : "A"}
            </div>

            <div className={cn("min-w-0 flex-1", isRTL ? "text-right" : "text-left")}>
              <p className="text-sm font-semibold text-white">{t("sidebar.session")}</p>
              <p className="mt-2 text-base font-extrabold text-white">
                {t("sidebar.manager")}
              </p>
              <p className="mt-1 truncate text-xs text-slate-400">
                admin@omangas.local
              </p>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            {t("sidebar.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
