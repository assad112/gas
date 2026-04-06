"use client";

import PricingTable from "@/components/pricing/pricing-table";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";

export default function PricingPage() {
  const {
    products,
    resources,
    refreshProducts,
    saveProduct,
    deleteProduct,
    productMutationIds
  } = useAdmin();
  const { locale } = useI18n();

  if (resources.products.loading && products.length === 0) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading products..." : "جاري تحميل المنتجات..."}
      />
    );
  }

  if (resources.products.error && products.length === 0) {
    return (
      <ErrorState
        title={locale === "en" ? "Unable to load products" : "تعذر تحميل المنتجات"}
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
          {locale === "en" ? "Products control" : "إدارة المنتجات"}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900 lg:text-3xl">
          {locale === "en"
            ? "Operational products by cylinder type"
            : "إدارة المنتجات حسب نوع الأسطوانة"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          {locale === "en"
            ? "Manage gas products, delivery fees, availability, and operational notes from one backend-backed products section."
            : "أدر المنتجات ورسوم التوصيل والتوفر والملاحظات التشغيلية من قسم واحد مرتبط فعليًا بالـ backend."}
        </p>
      </section>

      {products.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No products yet" : "لا توجد منتجات بعد"}
          description={
            locale === "en"
              ? "The products section is ready and connected, but no products are stored yet."
              : "قسم المنتجات جاهز ومرتبط، لكن لم يتم تخزين أي منتجات بعد."
          }
        />
      ) : (
        <PricingTable
          products={products}
          savingIds={productMutationIds}
          onSave={saveProduct}
          onDelete={deleteProduct}
        />
      )}
    </div>
  );
}
