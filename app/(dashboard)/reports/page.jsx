"use client";

import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users
} from "lucide-react";
import { useMemo } from "react";

import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function toCurrencyNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isWithinRange(value, start, end) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) && time >= start.getTime() && time <= end.getTime();
}

function downloadCsv(filename, headers, rows) {
  const escapeCell = (value) => {
    const normalized = value === null || value === undefined ? "" : String(value);
    return `"${normalized.replaceAll(`"`, `""`)}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function StatCard({ icon: Icon, title, value, subtitle, tone = "brand" }) {
  const tones = {
    brand: "from-brand-100 to-brand-50 text-brand-900",
    ocean: "from-ocean-100 to-ocean-50 text-ocean-900",
    emerald: "from-emerald-100 to-emerald-50 text-emerald-900",
    slate: "from-slate-100 to-slate-50 text-slate-900"
  };

  return (
    <article className="panel-surface relative overflow-hidden p-5">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-20 bg-gradient-to-b opacity-70",
          tones[tone] || tones.brand
        )}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">{value}</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">{subtitle}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </article>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="panel-surface p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-sm leading-7 text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function ReportsPage() {
  const {
    orders,
    drivers,
    customers,
    settings,
    resources,
    refreshAdminData
  } = useAdmin();
  const { locale, isRTL } = useI18n();

  const currencyCode = settings?.currencyCode || "OMR";

  const reportData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = endOfToday;

    const deliveredOrders = orders.filter((order) => order.status === "delivered");
    const todayOrders = orders.filter((order) =>
      isWithinRange(order.createdAt, startOfToday, endOfToday)
    );
    const todayDelivered = deliveredOrders.filter((order) =>
      isWithinRange(order.updatedAt || order.deliveredAt || order.createdAt, startOfToday, endOfToday)
    );
    const weeklyOrders = orders.filter((order) =>
      isWithinRange(order.createdAt, startOfWeek, endOfWeek)
    );
    const weeklyDelivered = deliveredOrders.filter((order) =>
      isWithinRange(order.updatedAt || order.deliveredAt || order.createdAt, startOfWeek, endOfWeek)
    );

    const totalDeliveredRevenue = deliveredOrders.reduce(
      (sum, order) => sum + toCurrencyNumber(order.totalAmount),
      0
    );
    const todayRevenue = todayDelivered.reduce(
      (sum, order) => sum + toCurrencyNumber(order.totalAmount),
      0
    );
    const weeklyRevenue = weeklyDelivered.reduce(
      (sum, order) => sum + toCurrencyNumber(order.totalAmount),
      0
    );

    const onlineDrivers = drivers.filter((driver) => driver.status === "online");
    const availableDrivers = onlineDrivers.filter(
      (driver) => driver.availability === "available"
    );

    const driverPerformance = drivers
      .map((driver) => {
        const driverOrders = deliveredOrders.filter(
          (order) => Number(order.assignedDriverId) === Number(driver.id)
        );
        const driverRevenue = driverOrders.reduce(
          (sum, order) => sum + toCurrencyNumber(order.totalAmount),
          0
        );

        return {
          id: driver.id,
          name: driver.name,
          status: driver.status,
          availability: driver.availability,
          deliveredCount: driverOrders.length,
          revenue: driverRevenue,
          lastSeenAt: driver.lastSeenAt || driver.lastLocationAt || null
        };
      })
      .sort((a, b) => {
        if (b.deliveredCount !== a.deliveredCount) {
          return b.deliveredCount - a.deliveredCount;
        }

        return b.revenue - a.revenue;
      });

    const averageOrderValue =
      deliveredOrders.length > 0 ? totalDeliveredRevenue / deliveredOrders.length : 0;

    return {
      todayOrders,
      todayDelivered,
      weeklyOrders,
      weeklyDelivered,
      totalDeliveredRevenue,
      todayRevenue,
      weeklyRevenue,
      onlineDrivers,
      availableDrivers,
      driverPerformance,
      averageOrderValue
    };
  }, [drivers, orders]);

  if (
    resources.orders.loading &&
    resources.drivers.loading &&
    resources.customers.loading &&
    orders.length === 0 &&
    drivers.length === 0 &&
    customers.length === 0
  ) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading reports..." : "جاري تحميل التقارير..."}
      />
    );
  }

  if (
    resources.orders.error &&
    resources.drivers.error &&
    orders.length === 0 &&
    drivers.length === 0
  ) {
    return (
      <ErrorState
        title={locale === "en" ? "Unable to load reports" : "تعذر تحميل التقارير"}
        description={resources.orders.error || resources.drivers.error}
        actionLabel={locale === "en" ? "Retry" : "إعادة المحاولة"}
        onAction={() => refreshAdminData()}
      />
    );
  }

  function exportOrdersCsv() {
    downloadCsv(
      "orders-report.csv",
      [
        "id",
        "customer_name",
        "phone",
        "status",
        "gas_type",
        "payment_method",
        "driver_name",
        "total_amount",
        "created_at"
      ],
      orders.map((order) => [
        order.id,
        order.name,
        order.phone,
        order.status,
        order.gasType,
        order.paymentMethod,
        order.driverName || "",
        order.totalAmount ?? "",
        order.createdAt || ""
      ])
    );
  }

  function exportCustomersCsv() {
    downloadCsv(
      "customers-report.csv",
      ["id", "full_name", "phone", "email", "orders_count", "last_order_at"],
      customers.map((customer) => [
        customer.id,
        customer.fullName,
        customer.phone,
        customer.email || "",
        customer.ordersCount,
        customer.lastOrderAt || ""
      ])
    );
  }

  function exportDriversCsv() {
    downloadCsv(
      "drivers-report.csv",
      [
        "id",
        "name",
        "phone",
        "status",
        "availability",
        "current_location",
        "vehicle_label",
        "license_number"
      ],
      drivers.map((driver) => [
        driver.id,
        driver.name,
        driver.phone,
        driver.status,
        driver.availability,
        driver.currentLocation || "",
        driver.vehicleLabel || "",
        driver.licenseNumber || ""
      ])
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface-dark relative overflow-hidden p-6 lg:p-8">
        <div
          className={cn(
            "absolute inset-y-0 w-48",
            isRTL
              ? "right-0 bg-gradient-to-l from-brand-500/20 to-transparent"
              : "left-0 bg-gradient-to-r from-brand-500/20 to-transparent"
          )}
        />
        <div
          className={cn(
            "absolute top-6 h-32 w-32 rounded-full bg-ocean-300/20 blur-3xl",
            isRTL ? "-left-10" : "-right-10"
          )}
        />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {locale === "en" ? "Executive reporting" : "التقارير التنفيذية"}
            </span>
            <h1 className="max-w-3xl text-2xl font-extrabold leading-tight text-white lg:text-3xl">
              {locale === "en"
                ? "Reports, KPI visibility, and operational exports"
                : "التقارير ومؤشرات الأداء والتصدير التشغيلي"}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
              {locale === "en"
                ? "Use this page to review daily and weekly operational movement, compare driver performance, and export working data for management."
                : "استخدم هذه الصفحة لمراجعة الحركة التشغيلية اليومية والأسبوعية، ومقارنة أداء السائقين، وتصدير البيانات العملية للإدارة."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button type="button" onClick={exportOrdersCsv} className="button-primary w-full">
              <Download className="h-4 w-4" />
              {locale === "en" ? "Export orders CSV" : "تصدير الطلبات CSV"}
            </button>
            <button type="button" onClick={exportCustomersCsv} className="button-secondary w-full bg-white/10 text-white hover:bg-white/15 hover:text-white">
              <Users className="h-4 w-4" />
              {locale === "en" ? "Export customers CSV" : "تصدير العملاء CSV"}
            </button>
            <button type="button" onClick={exportDriversCsv} className="button-secondary w-full bg-white/10 text-white hover:bg-white/15 hover:text-white sm:col-span-2 xl:col-span-1">
              <Truck className="h-4 w-4" />
              {locale === "en" ? "Export drivers CSV" : "تصدير السائقين CSV"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          title={locale === "en" ? "Delivered revenue" : "إيراد الطلبات المكتملة"}
          value={formatMoney(reportData.totalDeliveredRevenue, locale, currencyCode)}
          subtitle={
            locale === "en"
              ? "Revenue based on delivered orders with recorded totals."
              : "الإيراد محسوب من الطلبات المكتملة التي تحتوي على إجمالي مسجل."
          }
          tone="brand"
        />
        <StatCard
          icon={CalendarDays}
          title={locale === "en" ? "Today orders" : "طلبات اليوم"}
          value={formatNumber(reportData.todayOrders.length, locale)}
          subtitle={
            locale === "en"
              ? "All orders created during the current day."
              : "جميع الطلبات التي أُنشئت خلال اليوم الحالي."
          }
          tone="ocean"
        />
        <StatCard
          icon={Truck}
          title={locale === "en" ? "Online drivers" : "السائقون المتصلون"}
          value={formatNumber(reportData.onlineDrivers.length, locale)}
          subtitle={
            locale === "en"
              ? `${formatNumber(reportData.availableDrivers.length, locale)} available now.`
              : `${formatNumber(reportData.availableDrivers.length, locale)} متاحون الآن.`
          }
          tone="emerald"
        />
        <StatCard
          icon={Users}
          title={locale === "en" ? "Average order value" : "متوسط قيمة الطلب"}
          value={formatMoney(reportData.averageOrderValue, locale, currencyCode)}
          subtitle={
            locale === "en"
              ? "Average based on delivered orders."
              : "متوسط محسوب من الطلبات المكتملة."
          }
          tone="slate"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title={locale === "en" ? "Daily report" : "التقرير اليومي"}
          subtitle={
            locale === "en"
              ? "Current-day movement for orders and revenue."
              : "حركة اليوم الحالية للطلبات والإيرادات."
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-500">
                {locale === "en" ? "Created orders" : "الطلبات المنشأة"}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">
                {formatNumber(reportData.todayOrders.length, locale)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-500">
                {locale === "en" ? "Delivered today" : "المكتملة اليوم"}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">
                {formatNumber(reportData.todayDelivered.length, locale)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-500">
                {locale === "en" ? "Today revenue" : "إيراد اليوم"}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">
                {formatMoney(reportData.todayRevenue, locale, currencyCode)}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={locale === "en" ? "Weekly report" : "التقرير الأسبوعي"}
          subtitle={
            locale === "en"
              ? "Last 7 days snapshot for operations and revenue."
              : "ملخص آخر 7 أيام للتشغيل والإيراد."
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-500">
                {locale === "en" ? "Weekly orders" : "طلبات الأسبوع"}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">
                {formatNumber(reportData.weeklyOrders.length, locale)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-500">
                {locale === "en" ? "Weekly delivered" : "المكتملة أسبوعيًا"}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">
                {formatNumber(reportData.weeklyDelivered.length, locale)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-500">
                {locale === "en" ? "Weekly revenue" : "إيراد الأسبوع"}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">
                {formatMoney(reportData.weeklyRevenue, locale, currencyCode)}
              </p>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title={locale === "en" ? "Driver performance" : "أداء السائقين"}
          subtitle={
            locale === "en"
              ? "Sorted by delivered orders, then by delivered revenue."
              : "مرتب حسب عدد الطلبات المكتملة ثم الإيراد المحقق."
          }
        >
          {reportData.driverPerformance.length === 0 ? (
            <EmptyState
              title={locale === "en" ? "No driver data yet" : "لا توجد بيانات سائقين بعد"}
              description={
                locale === "en"
                  ? "Driver performance will appear here once linked orders exist."
                  : "سيظهر أداء السائقين هنا عند وجود طلبات مرتبطة بهم."
              }
            />
          ) : (
            <div className="space-y-3">
              {reportData.driverPerformance.map((driver) => (
                <article
                  key={driver.id}
                  className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {driver.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {locale === "en" ? "Last seen" : "آخر ظهور"}:{" "}
                        <span className="numeric-ltr">
                          {formatDateTime(driver.lastSeenAt, locale)}
                        </span>
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white px-3 py-3 text-center">
                        <p className="text-xs font-semibold text-slate-500">
                          {locale === "en" ? "Delivered" : "المكتملة"}
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-slate-950">
                          {formatNumber(driver.deliveredCount, locale)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3 text-center">
                        <p className="text-xs font-semibold text-slate-500">
                          {locale === "en" ? "Revenue" : "الإيراد"}
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-slate-950">
                          {formatMoney(driver.revenue, locale, currencyCode)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3 text-center">
                        <p className="text-xs font-semibold text-slate-500">
                          {locale === "en" ? "State" : "الحالة"}
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-slate-950">
                          {driver.status} / {driver.availability}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={locale === "en" ? "Audit log status" : "حالة سجل الرقابة"}
          subtitle={
            locale === "en"
              ? "Visible status for the audit layer requested in the admin roadmap."
              : "حالة واضحة لطبقة الرقابة المطلوبة ضمن خطة الأدمن."
          }
        >
          <div className="rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-brand-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {locale === "en" ? "Audit log is not wired yet" : "سجل الرقابة غير موصول بعد"}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {locale === "en"
                    ? "The reports page is now visible and supports KPI summaries plus CSV export, but a real audit trail still needs backend persistence for who changed what and when."
                    : "صفحة التقارير أصبحت ظاهرة الآن وتدعم مؤشرات الأداء والتصدير CSV، لكن سجل الرقابة الحقيقي ما زال يحتاج تخزينًا في الباكند يوضح من غيّر ماذا ومتى."}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
