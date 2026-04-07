"use client";

import { ChartColumnBig, PackageSearch, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { useMemo } from "react";

import PricingTable from "@/components/pricing/pricing-table";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, title, value, subtitle, tone = "brand" }) {
  const tones = {
    brand: "from-brand-100 to-brand-50 text-brand-900",
    emerald: "from-emerald-100 to-emerald-50 text-emerald-900",
    ocean: "from-ocean-100 to-ocean-50 text-ocean-900",
    slate: "from-slate-100 to-slate-50 text-slate-900"
  };

  return (
    <article className="panel-surface relative overflow-hidden p-5">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-20 bg-gradient-to-b opacity-75",
          tones[tone] || tones.brand
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

export default function PricingPage() {
  const {
    products,
    resources,
    refreshProducts,
    saveProduct,
    deleteProduct,
    productMutationIds
  } = useAdmin();
  const { locale, isRTL } = useI18n();
  const currencyCode = "OMR";

  const productStats = useMemo(() => {
    const totalProducts = products.length;
    const availableProducts = products.filter((product) => product.isAvailable).length;
    const averagePrice =
      totalProducts > 0
        ? products.reduce((sum, product) => sum + Number(product.price || 0), 0) /
          totalProducts
        : 0;
    const averageDeliveryFee =
      totalProducts > 0
        ? products.reduce(
            (sum, product) => sum + Number(product.deliveryFee || 0),
            0
          ) / totalProducts
        : 0;

    return {
      totalProducts,
      availableProducts,
      averagePrice,
      averageDeliveryFee
    };
  }, [products]);

  const catalogHighlights = useMemo(() => {
    const hiddenProducts = Math.max(
      productStats.totalProducts - productStats.availableProducts,
      0
    );
    const highestPriceProduct = [...products].sort(
      (left, right) => Number(right.price || 0) - Number(left.price || 0)
    )[0];
    const highestDeliveryProduct = [...products].sort(
      (left, right) =>
        Number(right.deliveryFee || 0) - Number(left.deliveryFee || 0)
    )[0];

    return {
      hiddenProducts,
      highestPriceProduct,
      highestDeliveryProduct
    };
  }, [productStats.availableProducts, productStats.totalProducts, products]);

  if (resources.products.loading && products.length === 0) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading products..." : "جارٍ تحميل المنتجات..."}
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
      <section className="panel-surface-dark relative overflow-hidden p-6 lg:p-8">
        <div
          className={cn(
            "absolute inset-y-0 w-52",
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

        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
              <PackageSearch className="h-3.5 w-3.5" />
              {locale === "en" ? "Products studio" : "استوديو المنتجات"}
            </span>
            <h1 className="max-w-3xl text-2xl font-extrabold leading-tight text-white lg:text-3xl">
              {locale === "en"
                ? "Professional product management for cylinders, pricing, and delivery fees"
                : "إدارة احترافية للمنتجات والأسطوانات والأسعار ورسوم التوصيل"}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
              {locale === "en"
                ? "Control the operational catalog from one place, review pricing quickly, and keep availability synchronized with the live backend."
                : "تحكم في كتالوج التشغيل من مكان واحد، وراجع الأسعار بسرعة، وحافظ على تزامن التوفر مع الباكيند المباشر."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
              <p className="text-xs text-slate-300">
                {locale === "en" ? "Catalog sync" : "مزامنة الكتالوج"}
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {locale === "en" ? "Live backend linked" : "مرتبط بالباكيند مباشرة"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => refreshProducts({ silent: true })}
              disabled={resources.products.refreshing}
              className="button-secondary w-full bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
              <RefreshCcw
                className={cn("h-4 w-4", resources.products.refreshing && "animate-spin")}
              />
              {locale === "en" ? "Refresh products" : "تحديث المنتجات"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={PackageSearch}
          title={locale === "en" ? "Total products" : "إجمالي المنتجات"}
          value={formatNumber(productStats.totalProducts, locale)}
          subtitle={
            locale === "en"
              ? "All cylinder products currently managed in the dashboard."
              : "كل منتجات الأسطوانات المُدارة حاليًا داخل لوحة التحكم."
          }
          tone="brand"
        />
        <StatCard
          icon={ShieldCheck}
          title={locale === "en" ? "Available now" : "المتاح الآن"}
          value={formatNumber(productStats.availableProducts, locale)}
          subtitle={
            locale === "en"
              ? "Products currently visible as available for operations."
              : "المنتجات الظاهرة حاليًا كمتاحة للتشغيل."
          }
          tone="emerald"
        />
        <StatCard
          icon={ChartColumnBig}
          title={locale === "en" ? "Average price" : "متوسط السعر"}
          value={formatMoney(productStats.averagePrice, locale, currencyCode)}
          subtitle={
            locale === "en"
              ? "Average list price across the configured product set."
              : "متوسط سعر البيع عبر مجموعة المنتجات الحالية."
          }
          tone="ocean"
        />
        <StatCard
          icon={Truck}
          title={locale === "en" ? "Average delivery fee" : "متوسط رسوم التوصيل"}
          value={formatMoney(productStats.averageDeliveryFee, locale, currencyCode)}
          subtitle={
            locale === "en"
              ? "Operational delivery fee average across all products."
              : "متوسط رسوم التوصيل التشغيلي عبر جميع المنتجات."
          }
          tone="slate"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <article className="panel-surface p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow-label">
                {locale === "en" ? "Catalog overview" : "نظرة عامة على الكتالوج"}
              </p>
              <h2 className="mt-3 text-xl font-extrabold text-slate-950">
                {locale === "en"
                  ? "A cleaner operational read before opening any product card"
                  : "قراءة تشغيلية أوضح قبل الدخول إلى أي بطاقة منتج"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                {locale === "en"
                  ? "Track catalog readiness, identify hidden items quickly, and spot the most commercially impactful cylinders from the top of the page."
                  : "تابع جاهزية الكتالوج، واكتشف العناصر المخفية بسرعة، وحدد أكثر الأسطوانات تأثيراً تجارياً من أعلى الصفحة مباشرة."}
              </p>
            </div>

            <div className="glass-chip">
              <ShieldCheck className="h-4 w-4" />
              {locale === "en"
                ? "Live catalog synced with backend"
                : "الكتالوج متزامن مباشرة مع الباكيند"}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {locale === "en" ? "Visible products" : "المنتجات الظاهرة"}
              </p>
              <p className="mt-3 text-3xl font-extrabold text-emerald-950">
                {formatNumber(productStats.availableProducts, locale)}
              </p>
              <p className="mt-2 text-xs leading-6 text-emerald-800/80">
                {locale === "en"
                  ? "Ready for ordering and operational use."
                  : "جاهزة للطلب وللاستخدام التشغيلي."}
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {locale === "en" ? "Hidden products" : "المنتجات المخفية"}
              </p>
              <p className="mt-3 text-3xl font-extrabold text-slate-950">
                {formatNumber(catalogHighlights.hiddenProducts, locale)}
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                {locale === "en"
                  ? "Currently out of the live operational catalog."
                  : "خارج كتالوج التشغيل المباشر حالياً."}
              </p>
            </div>

            <div className="rounded-[24px] border border-brand-100 bg-brand-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                {locale === "en" ? "Highest delivery fee" : "أعلى رسوم توصيل"}
              </p>
              <p className="mt-3 text-lg font-extrabold text-brand-950">
                {catalogHighlights.highestDeliveryProduct
                  ? locale === "en"
                    ? catalogHighlights.highestDeliveryProduct.nameEn
                    : catalogHighlights.highestDeliveryProduct.nameAr
                  : locale === "en"
                    ? "No products"
                    : "لا توجد منتجات"}
              </p>
              <p className="mt-2 text-xs leading-6 text-brand-800/80">
                {catalogHighlights.highestDeliveryProduct
                  ? formatMoney(
                      catalogHighlights.highestDeliveryProduct.deliveryFee,
                      locale,
                      currencyCode
                    )
                  : "--"}
              </p>
            </div>
          </div>
        </article>

        <article className="panel-surface-dark relative overflow-hidden p-5 sm:p-6">
          <div
            className={cn(
              "absolute top-0 h-32 w-32 rounded-full bg-brand-400/25 blur-3xl",
              isRTL ? "-left-8" : "-right-8"
            )}
          />
          <div className="relative z-10">
            <p className="eyebrow-label text-slate-300">
              {locale === "en" ? "Catalog spotlight" : "أبرز منتج"}
            </p>
            <h3 className="mt-3 text-xl font-extrabold text-white">
              {catalogHighlights.highestPriceProduct
                ? locale === "en"
                  ? catalogHighlights.highestPriceProduct.nameEn
                  : catalogHighlights.highestPriceProduct.nameAr
                : locale === "en"
                  ? "No featured product"
                  : "لا يوجد منتج مميز"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {catalogHighlights.highestPriceProduct
                ? locale === "en"
                  ? "This product currently carries the highest base price in your live catalog."
                  : "هذا المنتج يحمل حالياً أعلى سعر أساسي داخل الكتالوج المباشر."
                : locale === "en"
                  ? "Add products to unlock richer catalog insights."
                  : "أضف منتجات لعرض مؤشرات أغنى للكتالوج."}
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/10 p-4">
                <p className="text-xs text-slate-300">
                  {locale === "en" ? "Base price" : "السعر الأساسي"}
                </p>
                <p className="mt-2 text-2xl font-extrabold text-white">
                  {catalogHighlights.highestPriceProduct
                    ? formatMoney(
                        catalogHighlights.highestPriceProduct.price,
                        locale,
                        currencyCode
                      )
                    : "--"}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/10 p-4">
                <p className="text-xs text-slate-300">
                  {locale === "en" ? "Delivery fee" : "رسوم التوصيل"}
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {catalogHighlights.highestPriceProduct
                    ? formatMoney(
                        catalogHighlights.highestPriceProduct.deliveryFee,
                        locale,
                        currencyCode
                      )
                    : "--"}
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="panel-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {locale === "en" ? "Catalog controls" : "أدوات التحكم بالكتالوج"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              {locale === "en"
                ? "Edit names, pricing, delivery fees, and availability directly from structured product cards designed for faster operational review."
                : "عدّل الأسماء والأسعار ورسوم التوصيل وحالة التوفر مباشرة من بطاقات منتجات منظمة ومصممة لمراجعة تشغيلية أسرع."}
            </p>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs leading-6 text-slate-600">
            {locale === "en"
              ? "Saving a product updates the live backend immediately."
              : "حفظ أي منتج يحدّث الباكيند المباشر فورًا."}
          </div>
        </div>
      </section>

      {products.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No products yet" : "لا توجد منتجات بعد"}
          description={
            locale === "en"
              ? "The products page is fully ready, but the catalog is still empty."
              : "صفحة المنتجات أصبحت جاهزة بالكامل، لكن الكتالوج ما زال فارغًا."
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
