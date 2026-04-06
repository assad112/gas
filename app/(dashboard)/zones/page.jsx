"use client";

import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import ZonesTable from "@/components/zones/zones-table";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";

export default function ZonesPage() {
  const { zones, resources, refreshZones, saveZone, deleteZone, zoneMutationIds } =
    useAdmin();
  const { locale } = useI18n();

  if (resources.zones.loading && zones.length === 0) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading zones..." : "جاري تحميل المناطق..."}
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
      <section className="panel-surface p-6 lg:p-8">
        <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          {locale === "en" ? "Delivery zones" : "نطاقات التوصيل"}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900 lg:text-3xl">
          {locale === "en"
            ? "Manage Oman delivery coverage"
            : "إدارة تغطية التوصيل داخل عُمان"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          {locale === "en"
            ? "Control delivery fees, ETA, activation state, edit fields, and operational notes for every current and future zone."
            : "تحكم في رسوم التوصيل والوقت المتوقع وحالة التفعيل وتعديل الحقول والملاحظات التشغيلية لكل منطقة حالية أو مستقبلية."}
        </p>
      </section>

      {zones.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No delivery zones yet" : "لا توجد مناطق توصيل بعد"}
          description={
            locale === "en"
              ? "The zones section is connected and ready, but no delivery coverage rows are stored yet."
              : "قسم المناطق متصل وجاهز، لكن لم يتم تخزين أي نطاقات توصيل بعد."
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
