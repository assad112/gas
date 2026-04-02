"use client";

import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import PricingTable from "@/components/pricing/pricing-table";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";

export default function PricingPage() {
  const { products, resources, refreshProducts, saveProduct, productMutationIds } =
    useAdmin();
  const { locale } = useI18n();

  if (resources.products.loading && products.length === 0) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading pricing..." : "جاري تحميل الأسعار..."}
      />
    );
  }

  if (resources.products.error && products.length === 0) {
    return (
      <ErrorState
        title={locale === "en" ? "Unable to load pricing" : "تعذر تحميل التسعير"}
        description={resources.products.error}
        actionLabel={locale === "en" ? "Retry" : "إعادة المحاولة"}
        onAction={() => refreshProducts()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface p-6 lg:p-8">
        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          {locale === "en" ? "Pricing control" : "إدارة التسعير"}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900 lg:text-3xl">
          {locale === "en"
            ? "Operational pricing by cylinder type"
            : "التسعير التشغيلي حسب نوع الأسطوانة"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          {locale === "en"
            ? "Manage gas products, delivery fees, availability, and operational notes from a real backend-backed section."
            : "أدر أنواع الأسطوانات ورسوم التوصيل والتوفر والملاحظات التشغيلية من قسم مرتبط فعليًا بالـ backend."}
        </p>
      </section>

      {products.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No pricing rows yet" : "لا توجد صفوف تسعير بعد"}
          description={
            locale === "en"
              ? "The pricing UI is ready and connected, but no products are stored yet."
              : "واجهة التسعير جاهزة ومرتبطة، لكن لم يتم تخزين أي منتجات بعد."
          }
        />
      ) : (
        <PricingTable
          products={products}
          savingIds={productMutationIds}
          onSave={saveProduct}
        />
      )}
    </div>
  );
}
