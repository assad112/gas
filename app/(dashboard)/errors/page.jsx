"use client";

import {
  AlertTriangle,
  Bug,
  MonitorSmartphone,
  RefreshCcw,
  Search,
  ServerCrash,
  ShieldAlert,
  Truck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { useI18n } from "@/hooks/use-i18n";
import { formatDateTime, formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchErrorLogsRequest } from "@/services/api";

function SummaryCard({ title, value, subtitle, tone = "slate", icon: Icon }) {
  const tones = {
    slate: "from-slate-100 to-slate-50 text-slate-900",
    amber: "from-amber-100 to-amber-50 text-amber-900",
    rose: "from-rose-100 to-rose-50 text-rose-900",
    ocean: "from-ocean-100 to-ocean-50 text-ocean-900"
  };

  return (
    <article className="panel-surface relative overflow-hidden p-5">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-20 bg-gradient-to-b opacity-75",
          tones[tone] || tones.slate
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

function levelTone(level) {
  if (level === "error") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (level === "warn") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function sourceTone(source) {
  if (source === "process" || source === "startup") {
    return "border-slate-300 bg-slate-100 text-slate-800";
  }

  if (source === "client" || source === "socket") {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }

  return "border-ocean-200 bg-ocean-50 text-ocean-800";
}

function appTone(appSource) {
  if (appSource === "customer_app") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (appSource === "driver_app") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getAppLabel(appSource, locale) {
  if (appSource === "customer_app") {
    return locale === "en" ? "Customer app" : "تطبيق المستخدم";
  }

  if (appSource === "driver_app") {
    return locale === "en" ? "Driver app" : "تطبيق السائق";
  }

  return locale === "en" ? "Backend / dashboard" : "الباكيند / الداشبورد";
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="grid gap-2 rounded-2xl bg-slate-50/80 px-4 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className={cn("text-sm text-slate-700", mono && "numeric-ltr font-mono text-xs")}>
        {value || "--"}
      </p>
    </div>
  );
}

export default function ErrorsPage() {
  const { locale, isRTL } = useI18n();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [appSourceFilter, setAppSourceFilter] = useState("all");
  const [expandedLogId, setExpandedLogId] = useState(null);

  async function loadLogs({ silent = false } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetchErrorLogsRequest({
        limit: 80,
        ...(levelFilter !== "all" ? { level: levelFilter } : {}),
        ...(sourceFilter !== "all" ? { source: sourceFilter } : {}),
        ...(appSourceFilter !== "all" ? { appSource: appSourceFilter } : {}),
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {})
      });

      setLogs(response.logs || []);
      setSummary(response.summary || null);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error?.message || "Unable to load error logs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredCounts = useMemo(
    () => ({
      errors: logs.filter((log) => log.level === "error").length,
      warnings: logs.filter((log) => log.level === "warn").length,
      process: logs.filter((log) => log.source === "process").length,
      http: logs.filter((log) => log.source === "http").length,
      customerApp: logs.filter((log) => log.appSource === "customer_app").length,
      driverApp: logs.filter((log) => log.appSource === "driver_app").length
    }),
    [logs]
  );

  if (loading) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading error center..." : "جارٍ تحميل مركز الأخطاء..."}
      />
    );
  }

  if (errorMessage && logs.length === 0) {
    return (
      <ErrorState
        title={locale === "en" ? "Unable to load error logs" : "تعذر تحميل سجل الأخطاء"}
        description={errorMessage}
        actionLabel={locale === "en" ? "Retry" : "إعادة المحاولة"}
        onAction={() => loadLogs()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface-dark relative overflow-hidden p-6 lg:p-8">
        <div
          className={cn(
            "absolute inset-y-0 w-48",
            isRTL
              ? "right-0 bg-gradient-to-l from-rose-500/20 to-transparent"
              : "left-0 bg-gradient-to-r from-rose-500/20 to-transparent"
          )}
        />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
              <ShieldAlert className="h-3.5 w-3.5" />
              {locale === "en" ? "Operational error center" : "مركز الأخطاء التشغيلي"}
            </span>
            <h1 className="max-w-3xl text-2xl font-extrabold leading-tight text-white lg:text-3xl">
              {locale === "en"
                ? "Track backend failures, validation issues, and runtime exceptions"
                : "تابع أعطال الباكيند ومشاكل التحقق والاستثناءات التشغيلية"}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
              {locale === "en"
                ? "Every API failure, not-found route, and unhandled process error is persisted in the dashboard and appended to the server log file."
                : "كل فشل في الـ API وكل مسار غير موجود وكل خطأ غير معالج يُحفظ داخل الداشبورد ويُضاف أيضًا إلى ملف سجل الخادم."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadLogs({ silent: true })}
            disabled={refreshing}
            className="button-secondary w-full bg-white/10 text-white hover:bg-white/15 hover:text-white sm:w-auto"
          >
            <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {locale === "en" ? "Refresh logs" : "تحديث السجل"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={Bug}
          title={locale === "en" ? "Total logs" : "إجمالي السجلات"}
          value={formatNumber(summary?.totalLogs || logs.length, locale)}
          subtitle={
            locale === "en"
              ? "All captured error and warning entries."
              : "كل الأخطاء والتحذيرات التي تم التقاطها."
          }
          tone="slate"
        />
        <SummaryCard
          icon={AlertTriangle}
          title={locale === "en" ? "Last 24h" : "آخر 24 ساعة"}
          value={formatNumber(summary?.last24h || 0, locale)}
          subtitle={
            locale === "en"
              ? "Recent incidents across the platform."
              : "الحوادث الحديثة عبر النظام."
          }
          tone="amber"
        />
        <SummaryCard
          icon={MonitorSmartphone}
          title={locale === "en" ? "Customer app" : "تطبيق المستخدم"}
          value={formatNumber(summary?.customerAppCount || filteredCounts.customerApp, locale)}
          subtitle={
            locale === "en"
              ? "Errors reported by the customer mobile app."
              : "الأخطاء الواردة من تطبيق المستخدم."
          }
          tone="ocean"
        />
        <SummaryCard
          icon={Truck}
          title={locale === "en" ? "Driver app" : "تطبيق السائق"}
          value={formatNumber(summary?.driverAppCount || filteredCounts.driverApp, locale)}
          subtitle={
            locale === "en"
              ? "Errors reported by the driver mobile app."
              : "الأخطاء الواردة من تطبيق السائق."
          }
          tone="amber"
        />
        <SummaryCard
          icon={ServerCrash}
          title={locale === "en" ? "Backend errors" : "أخطاء الباكيند"}
          value={formatNumber(summary?.errorCount || filteredCounts.errors, locale)}
          subtitle={
            locale === "en"
              ? `${formatNumber(summary?.processCount || filteredCounts.process, locale)} process incidents and ${formatNumber(summary?.httpCount || filteredCounts.http, locale)} HTTP issues.`
              : `${formatNumber(summary?.processCount || filteredCounts.process, locale)} حوادث عملية و${formatNumber(summary?.httpCount || filteredCounts.http, locale)} مشاكل HTTP.`
          }
          tone="ocean"
        />
      </section>

      <section className="panel-surface p-5 sm:p-6">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-premium pl-11"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={
                locale === "en"
                  ? "Search by message, path, method, or request id..."
                  : "ابحث بالرسالة أو المسار أو الطريقة أو رقم الطلب..."
              }
            />
          </div>

          <select
            className="select-premium"
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
          >
            <option value="all">{locale === "en" ? "All levels" : "كل المستويات"}</option>
            <option value="error">{locale === "en" ? "Errors" : "أخطاء"}</option>
            <option value="warn">{locale === "en" ? "Warnings" : "تحذيرات"}</option>
          </select>

          <select
            className="select-premium"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
          >
            <option value="all">{locale === "en" ? "All sources" : "كل المصادر"}</option>
            <option value="http">HTTP</option>
            <option value="client">{locale === "en" ? "Client" : "التطبيق"}</option>
            <option value="socket">Socket</option>
            <option value="process">{locale === "en" ? "Process" : "العملية"}</option>
            <option value="startup">{locale === "en" ? "Startup" : "الإقلاع"}</option>
          </select>

          <select
            className="select-premium"
            value={appSourceFilter}
            onChange={(event) => setAppSourceFilter(event.target.value)}
          >
            <option value="all">{locale === "en" ? "All apps" : "كل التطبيقات"}</option>
            <option value="customer_app">{locale === "en" ? "Customer app" : "تطبيق المستخدم"}</option>
            <option value="driver_app">{locale === "en" ? "Driver app" : "تطبيق السائق"}</option>
            <option value="backend">{locale === "en" ? "Backend / dashboard" : "الباكيند / الداشبورد"}</option>
          </select>

          <button type="button" onClick={() => loadLogs({ silent: true })} className="button-primary">
            <Search className="h-4 w-4" />
            {locale === "en" ? "Apply" : "تطبيق"}
          </button>
        </div>

        <p className="mt-4 text-xs leading-6 text-slate-500">
          {locale === "en" ? "File log path" : "مسار ملف السجل"}:{" "}
          <span className="font-mono">{summary?.filePath || "logs/errors.log"}</span>
        </p>
      </section>

      <section className="space-y-4">
        {logs.length === 0 ? (
          <EmptyState
            title={locale === "en" ? "No errors captured" : "لا توجد أخطاء مسجلة"}
            description={
              locale === "en"
                ? "Once the backend captures runtime or HTTP failures, they will appear here."
                : "عند التقاط أعطال تشغيلية أو مشاكل HTTP من الباكيند ستظهر هنا."
            }
          />
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogId === log.id;

            return (
              <article key={log.id} className="panel-surface p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelTone(log.level)}`}>
                        {log.level}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${sourceTone(log.source)}`}>
                        {log.source}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${appTone(log.appSource)}`}>
                        {getAppLabel(log.appSource, locale)}
                      </span>
                      {log.clientChannel ? (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {log.clientChannel}
                        </span>
                      ) : null}
                      {log.statusCode ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          HTTP {log.statusCode}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h2 className="text-lg font-extrabold text-slate-950">
                        {log.errorName || "Error"}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{log.message}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-slate-500 lg:items-end">
                    <p>{formatDateTime(log.createdAt, locale)}</p>
                    <p>{formatRelativeTime(log.createdAt, locale)}</p>
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="button-secondary"
                    >
                      {locale === "en"
                        ? isExpanded
                          ? "Hide details"
                          : "Show details"
                        : isExpanded
                          ? "إخفاء التفاصيل"
                          : "عرض التفاصيل"}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-5 space-y-3">
                    <DetailRow
                      label={locale === "en" ? "Application" : "التطبيق"}
                      value={getAppLabel(log.appSource, locale)}
                    />
                    <DetailRow
                      label={locale === "en" ? "Channel" : "القناة"}
                      value={log.clientChannel}
                    />
                    <DetailRow
                      label={locale === "en" ? "Platform" : "المنصة"}
                      value={log.clientPlatform}
                    />
                    <DetailRow
                      label={locale === "en" ? "Version" : "الإصدار"}
                      value={log.clientVersion}
                    />
                    <DetailRow label="Path" value={log.path} mono />
                    <DetailRow label="Method" value={log.method} />
                    <DetailRow label="Request ID" value={log.requestId} mono />
                    <DetailRow label="IP" value={log.ipAddress} mono />
                    <DetailRow label="User-Agent" value={log.userAgent} />

                    <div className="rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                      <p className="mb-3 font-semibold text-white">Stack Trace</p>
                      <pre className="overflow-x-auto whitespace-pre-wrap leading-6">
                        {log.stackTrace || (locale === "en" ? "No stack trace captured." : "لم يتم التقاط stack trace.")}
                      </pre>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-700">
                      <p className="mb-3 font-semibold text-slate-900">Metadata</p>
                      <pre className="overflow-x-auto whitespace-pre-wrap leading-6">
                        {JSON.stringify(log.metadata || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
