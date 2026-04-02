"use client";

import {
  Activity,
  Filter,
  Plus,
  Search,
  Signal,
  Truck,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { useMemo, useState } from "react";

import DriverCreateForm from "@/components/drivers/driver-create-form";
import DriversTable from "@/components/drivers/drivers-table";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const toneMap = {
  slate: "from-slate-100 to-slate-50 text-slate-900",
  emerald: "from-emerald-100 to-emerald-50 text-emerald-900",
  sky: "from-sky-100 to-sky-50 text-sky-900",
  amber: "from-amber-100 to-amber-50 text-amber-900"
};

function StatPanel({ icon: Icon, title, value, subtitle, tone }) {
  return (
    <article className="panel-surface relative overflow-hidden p-5">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-20 bg-gradient-to-b opacity-70",
          toneMap[tone] || toneMap.slate
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

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition duration-200",
        active
          ? "bg-slate-950 text-white shadow-[0_18px_35px_-24px_rgba(15,23,42,0.75)]"
          : "border border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700"
      )}
    >
      {children}
    </button>
  );
}

export default function DriversPage() {
  const {
    drivers,
    resources,
    creatingDriver,
    driverMutationIds,
    refreshDrivers,
    createDriver,
    updateDriver,
    resetDriverPassword,
    deleteDriver
  } = useAdmin();
  const { locale, isRTL } = useI18n();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  const onlineDrivers = useMemo(
    () => drivers.filter((driver) => driver.status === "online"),
    [drivers]
  );
  const availableDrivers = useMemo(
    () =>
      drivers.filter(
        (driver) =>
          driver.status === "online" && driver.availability === "available"
      ),
    [drivers]
  );
  const offlineDrivers = useMemo(
    () => drivers.filter((driver) => driver.status !== "online"),
    [drivers]
  );

  const filteredDrivers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return drivers.filter((driver) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [driver.name, driver.phone, driver.username, driver.currentLocation]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedQuery)
          );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && driver.status === "online") ||
        (statusFilter === "inactive" && driver.status !== "online");

      return matchesQuery && matchesStatus;
    });
  }, [drivers, query, statusFilter]);

  if (resources.drivers.loading && drivers.length === 0) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading drivers..." : "جارٍ تحميل السائقين..."}
      />
    );
  }

  if (resources.drivers.error && drivers.length === 0) {
    return (
      <ErrorState
        title={locale === "en" ? "Unable to load drivers" : "تعذر تحميل السائقين"}
        description={resources.drivers.error}
        actionLabel={locale === "en" ? "Retry" : "إعادة المحاولة"}
        onAction={() => refreshDrivers()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface-dark relative overflow-hidden p-6 lg:p-8">
        <div
          className={cn(
            "absolute inset-y-0 w-56",
            isRTL
              ? "right-0 bg-gradient-to-l from-ocean-400/20 to-transparent"
              : "left-0 bg-gradient-to-r from-ocean-400/20 to-transparent"
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
              <Signal className="h-3.5 w-3.5" />
              {locale === "en" ? "Live Fleet Control" : "مركز الأسطول المباشر"}
            </span>
            <h1 className="max-w-3xl text-2xl font-extrabold leading-tight text-white lg:text-3xl">
              {locale === "en"
                ? "Drivers Page, Upgraded for Real Operations"
                : "صفحة السائقين بشكل أحدث لتشغيل حقيقي"}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
              {locale === "en"
                ? "A cleaner delivery-style control center with quick search, smart filtering, production-ready driver cards, and a more guided onboarding flow."
                : "لوحة تحكم أنظف على نمط تطبيقات التوصيل الحقيقية مع بحث سريع وفلترة ذكية وبطاقات سائقين احترافية وتجربة إضافة أكثر سلاسة."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => refreshDrivers()}
              className="button-secondary bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
              <Users className="h-4 w-4" />
              {locale === "en" ? "Refresh drivers" : "تحديث السائقين"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreatePanel(true)}
              className="button-primary shadow-[0_24px_40px_-24px_rgba(249,115,22,0.75)]"
            >
              <Plus className="h-4 w-4" />
              {locale === "en" ? "Add Driver" : "إضافة سائق"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatPanel
          icon={Truck}
          title={locale === "en" ? "Total Drivers" : "إجمالي السائقين"}
          value={drivers.length}
          subtitle={
            locale === "en"
              ? "All driver records currently connected to the dashboard."
              : "جميع سجلات السائقين المرتبطة حاليًا بلوحة التحكم."
          }
          tone="slate"
        />
        <StatPanel
          icon={UserCheck}
          title={locale === "en" ? "Active Drivers" : "السائقون النشطون"}
          value={onlineDrivers.length}
          subtitle={
            locale === "en"
              ? "Online now and ready to receive operational updates."
              : "متصلون الآن ومستعدون لاستقبال تحديثات التشغيل."
          }
          tone="emerald"
        />
        <StatPanel
          icon={Activity}
          title={locale === "en" ? "Available Drivers" : "السائقون المتاحون"}
          value={availableDrivers.length}
          subtitle={
            locale === "en"
              ? "Immediately available for dispatching new orders."
              : "متاحون فورًا لإسناد الطلبات الجديدة."
          }
          tone="sky"
        />
        <StatPanel
          icon={Users}
          title={locale === "en" ? "Offline Drivers" : "السائقون غير المتصلين"}
          value={offlineDrivers.length}
          subtitle={
            locale === "en"
              ? "Accounts that need reconnecting or later follow-up."
              : "حسابات تحتاج إعادة اتصال أو متابعة لاحقًا."
          }
          tone="amber"
        />
      </section>

      <section className="panel-surface overflow-hidden p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="eyebrow-label">
              {locale === "en" ? "Search and filter" : "بحث وفلترة"}
            </p>
            <h2 className="mt-2 text-xl font-extrabold text-slate-950">
              {locale === "en" ? "Find the right driver fast" : "اعثر على السائق المناسب بسرعة"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {locale === "en"
                ? "Search by name or phone, then narrow the list to active or inactive drivers."
                : "ابحث بالاسم أو الهاتف، ثم قلّص القائمة إلى السائقين النشطين أو غير المتصلين."}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {locale === "en"
              ? `${filteredDrivers.length} result(s) shown from ${drivers.length} drivers`
              : `يتم عرض ${filteredDrivers.length} نتيجة من أصل ${drivers.length} سائقين`}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search
              className={cn(
                "pointer-events-none absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400",
                isRTL ? "right-4" : "left-4"
              )}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                locale === "en"
                  ? "Search drivers by name or phone"
                  : "ابحث عن السائق بالاسم أو رقم الهاتف"
              }
              className={cn(
                "input-premium h-12 shadow-none",
                isRTL ? "pr-11" : "pl-11"
              )}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
              <Filter className="h-4 w-4" />
              {locale === "en" ? "Filter" : "فلتر"}
            </div>

            <FilterButton
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              {locale === "en" ? "All" : "الكل"}
            </FilterButton>
            <FilterButton
              active={statusFilter === "active"}
              onClick={() => setStatusFilter("active")}
            >
              {locale === "en" ? "Active" : "نشط"}
            </FilterButton>
            <FilterButton
              active={statusFilter === "inactive"}
              onClick={() => setStatusFilter("inactive")}
            >
              {locale === "en" ? "Inactive" : "غير متصل"}
            </FilterButton>
          </div>
        </div>
      </section>

      {drivers.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No drivers yet" : "لا يوجد سائقون بعد"}
          description={
            locale === "en"
              ? "Start by adding your first driver from the top-right action button."
              : "ابدأ بإضافة أول سائق من زر الإضافة في أعلى الصفحة."
          }
        />
      ) : filteredDrivers.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No drivers match this search" : "لا يوجد سائقون يطابقون هذا البحث"}
          description={
            locale === "en"
              ? "Try another name, phone number, or filter combination."
              : "جرّب اسمًا آخر أو رقم هاتف مختلفًا أو غيّر الفلترة الحالية."
          }
        />
      ) : (
        <DriversTable
          drivers={filteredDrivers}
          onUpdate={updateDriver}
          onResetPassword={resetDriverPassword}
          onDeleteDriver={deleteDriver}
          mutationIds={driverMutationIds}
        />
      )}

      {showCreatePanel ? (
        <div className="fixed inset-0 z-50 bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCreatePanel(false)}
                className="button-secondary bg-white text-slate-700"
              >
                <X className="h-4 w-4" />
                {locale === "en" ? "Close" : "إغلاق"}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <DriverCreateForm
                onCreate={createDriver}
                onUpdateDriver={updateDriver}
                creating={creatingDriver}
                onClose={() => setShowCreatePanel(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
