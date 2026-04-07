"use client";

import {
  FileText,
  PackageSearch,
  Pencil,
  Save,
  Trash2,
  Truck,
  X
} from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/hooks/use-i18n";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const CURRENCY_CODE = "OMR";

function buildDraft(product) {
  return {
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    sizeLabel: product.sizeLabel,
    price: String(product.price),
    deliveryFee: String(product.deliveryFee),
    isAvailable: product.isAvailable,
    operationalNotes: product.operationalNotes || ""
  };
}

function buildInitialState(products) {
  return products.reduce((accumulator, product) => {
    accumulator[product.id] = buildDraft(product);
    return accumulator;
  }, {});
}

function hasDraftChanges(product, draft) {
  if (!draft) {
    return false;
  }

  return (
    draft.nameAr !== product.nameAr ||
    draft.nameEn !== product.nameEn ||
    draft.sizeLabel !== product.sizeLabel ||
    Number(draft.price || 0) !== Number(product.price || 0) ||
    Number(draft.deliveryFee || 0) !== Number(product.deliveryFee || 0) ||
    Boolean(draft.isAvailable) !== Boolean(product.isAvailable) ||
    (draft.operationalNotes || "") !== (product.operationalNotes || "")
  );
}

function fieldClass(isEditing) {
  return cn(
    "input-premium",
    !isEditing &&
      "cursor-default border-slate-100 bg-slate-50/80 text-slate-700 focus:border-slate-100 focus:ring-0"
  );
}

function textareaClass(isEditing) {
  return cn(
    "min-h-[170px] w-full rounded-[24px] border px-4 py-3 text-sm text-slate-900 outline-none transition",
    isEditing
      ? "border-slate-200 bg-white/90 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
      : "cursor-default border-slate-100 bg-slate-50/80 text-slate-700"
  );
}

function availabilityLabel(locale, isAvailable) {
  if (locale === "en") {
    return isAvailable ? "Available now" : "Hidden from operations";
  }

  return isAvailable ? "متاح الآن" : "مخفي عن التشغيل";
}

function availabilityHint(locale, isAvailable) {
  if (locale === "en") {
    return isAvailable
      ? "Visible in the live operational catalog."
      : "Hidden until you reactivate this cylinder.";
  }

  return isAvailable
    ? "ظاهر الآن داخل كتالوج التشغيل المباشر."
    : "مخفي حالياً حتى تقوم بإعادة تفعيله.";
}

function MetricTile({ label, value, helper, tone = "slate", icon: Icon = null }) {
  const toneClasses = {
    slate: "border-slate-200 bg-white/82 text-slate-900",
    brand: "border-brand-100 bg-brand-50/75 text-brand-900",
    ocean: "border-ocean-100 bg-ocean-50/75 text-ocean-900",
    emerald: "border-emerald-100 bg-emerald-50/75 text-emerald-900"
  };

  return (
    <div
      className={cn(
        "rounded-[24px] border p-4 shadow-[0_22px_40px_-36px_rgba(15,23,42,0.24)]",
        toneClasses[tone] || toneClasses.slate
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-lg font-extrabold leading-tight">{value}</p>
          {helper ? (
            <p className="mt-2 text-xs leading-6 text-slate-500">{helper}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-[30px] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,0.96))] p-5 shadow-[0_22px_40px_-36px_rgba(15,23,42,0.22)]">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-slate-900 text-white shadow-[0_16px_30px_-20px_rgba(15,23,42,0.72)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FieldBlock({ label, children, helper = null }) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white/82 p-4 shadow-[0_18px_32px_-34px_rgba(15,23,42,0.18)]">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {helper ? (
        <p className="mt-2 text-xs leading-6 text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value, tone = "slate" }) {
  const toneClasses = {
    slate: "bg-slate-50 text-slate-700",
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
    ocean: "bg-ocean-50 text-ocean-700"
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-100 bg-white/88 px-4 py-3">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span
        className={cn(
          "rounded-full px-3 py-1 text-sm font-bold",
          toneClasses[tone] || toneClasses.slate
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function PricingTable({
  products,
  savingIds,
  onSave,
  onDelete
}) {
  const { locale, isRTL } = useI18n();
  const [drafts, setDrafts] = useState(() => buildInitialState(products));
  const [editingIds, setEditingIds] = useState({});

  useEffect(() => {
    setDrafts(buildInitialState(products));
  }, [products]);

  function updateDraft(productId, key, value) {
    setDrafts((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        [key]: value
      }
    }));
  }

  function setEditing(productId, isEditing) {
    setEditingIds((current) => ({
      ...current,
      [productId]: isEditing
    }));
  }

  function resetDraft(product) {
    setDrafts((current) => ({
      ...current,
      [product.id]: buildDraft(product)
    }));
  }

  return (
    <div className="grid gap-6">
      {products.map((product) => {
        const draft = drafts[product.id] || {};
        const isSaving = Boolean(savingIds?.[product.id]);
        const isEditing = Boolean(editingIds?.[product.id]);
        const isDirty = hasDraftChanges(product, draft);
        const primaryName = locale === "en" ? product.nameEn : product.nameAr;
        const secondaryName = locale === "en" ? product.nameAr : product.nameEn;
        const previewTotal =
          Number(draft.price || 0) + Number(draft.deliveryFee || 0);
        const notesPreview = (draft.operationalNotes || "").trim();

        return (
          <section
            key={product.id}
            className={cn(
              "panel-surface overflow-hidden p-0",
              isEditing &&
                "border-brand-200 shadow-[0_28px_80px_-42px_rgba(255,124,31,0.38)]"
            )}
          >
            <div className="relative overflow-hidden border-b border-slate-100">
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-36",
                  draft.isAvailable
                    ? "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_42%),radial-gradient(circle_at_top_left,rgba(255,124,31,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))]"
                    : "bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.24),transparent_42%),radial-gradient(circle_at_top_left,rgba(255,124,31,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))]"
                )}
              />

              <div className="relative z-10 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {product.code}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      draft.isAvailable
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    )}
                  >
                    {availabilityLabel(locale, draft.isAvailable)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      isEditing
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-500"
                    )}
                  >
                    {isEditing
                      ? locale === "en"
                        ? "Editing live card"
                        : "وضع تحرير مباشر"
                      : locale === "en"
                        ? "Review mode"
                        : "وضع المراجعة"}
                  </span>
                  {isDirty ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {locale === "en" ? "Unsaved changes" : "تغييرات غير محفوظة"}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
                  <div className="min-w-0">
                    <p className="eyebrow-label">
                      {locale === "en" ? "Product command card" : "بطاقة تشغيل المنتج"}
                    </p>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-[2rem]">
                      {primaryName}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {secondaryName}
                    </p>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                      {isEditing
                        ? locale === "en"
                          ? "Update commercial naming, pricing, and operational notes from a single live card designed for fast back-office review."
                          : "حدّث الاسم التجاري والسعر والملاحظات التشغيلية من بطاقة مباشرة واحدة مصممة لمراجعة تشغيلية أسرع."
                        : locale === "en"
                          ? "This card gives the operations team a clean read-only product snapshot until you enable edit mode."
                          : "تعرض هذه البطاقة ملخصاً واضحاً للمنتج لفريق التشغيل حتى تقوم بتفعيل وضع التعديل."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricTile
                      label={locale === "en" ? "Size" : "الحجم"}
                      value={product.sizeLabel || "--"}
                      helper={
                        locale === "en"
                          ? "Displayed across order flows."
                          : "يظهر في جميع تدفقات الطلب."
                      }
                      tone="slate"
                      icon={PackageSearch}
                    />
                    <MetricTile
                      label={locale === "en" ? "Base price" : "السعر الأساسي"}
                      value={formatMoney(draft.price || 0, locale, CURRENCY_CODE)}
                      helper={
                        locale === "en"
                          ? "Current commercial value."
                          : "القيمة التجارية الحالية."
                      }
                      tone="brand"
                    />
                    <MetricTile
                      label={locale === "en" ? "Delivery fee" : "رسوم التوصيل"}
                      value={formatMoney(draft.deliveryFee || 0, locale, CURRENCY_CODE)}
                      helper={
                        locale === "en"
                          ? "Operational delivery charge."
                          : "رسوم التوصيل التشغيلية."
                      }
                      tone="ocean"
                      icon={Truck}
                    />
                    <MetricTile
                      label={locale === "en" ? "Delivered total" : "الإجمالي مع التوصيل"}
                      value={formatMoney(previewTotal, locale, CURRENCY_CODE)}
                      helper={
                        locale === "en"
                          ? "Price plus delivery for quick review."
                          : "السعر مضافاً إليه التوصيل للمراجعة السريعة."
                      }
                      tone="emerald"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_340px]">
                <div className="space-y-5">
                  <SectionCard
                    icon={PackageSearch}
                    title={
                      locale === "en" ? "Commercial identity" : "الهوية التجارية"
                    }
                    description={
                      locale === "en"
                        ? "Keep the bilingual product naming, size label, and pricing fields aligned for the live operational catalog."
                        : "حافظ على اتساق أسماء المنتج باللغتين والحجم وحقول التسعير داخل كتالوج التشغيل المباشر."
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <FieldBlock
                        label={locale === "en" ? "Arabic name" : "الاسم العربي"}
                      >
                        <input
                          className={fieldClass(isEditing)}
                          disabled={!isEditing}
                          value={draft.nameAr || ""}
                          onChange={(event) =>
                            updateDraft(product.id, "nameAr", event.target.value)
                          }
                        />
                      </FieldBlock>

                      <FieldBlock
                        label={locale === "en" ? "English name" : "الاسم الإنجليزي"}
                      >
                        <input
                          className={fieldClass(isEditing)}
                          disabled={!isEditing}
                          value={draft.nameEn || ""}
                          onChange={(event) =>
                            updateDraft(product.id, "nameEn", event.target.value)
                          }
                        />
                      </FieldBlock>

                      <FieldBlock
                        label={locale === "en" ? "Size label" : "الحجم"}
                        helper={
                          locale === "en"
                            ? "Shown in cards, checkout, and order details."
                            : "يظهر في البطاقات وصفحات الطلب والتفاصيل."
                        }
                      >
                        <input
                          className={fieldClass(isEditing)}
                          disabled={!isEditing}
                          value={draft.sizeLabel || ""}
                          onChange={(event) =>
                            updateDraft(product.id, "sizeLabel", event.target.value)
                          }
                        />
                      </FieldBlock>

                      <FieldBlock
                        label={locale === "en" ? "Price" : "السعر"}
                        helper={
                          locale === "en"
                            ? "Stored as an OMR numeric value."
                            : "يُحفظ كقيمة رقمية بالريال العماني."
                        }
                      >
                        <input
                          type="number"
                          step="0.001"
                          className={cn(fieldClass(isEditing), "numeric-ltr")}
                          disabled={!isEditing}
                          value={draft.price || ""}
                          onChange={(event) =>
                            updateDraft(product.id, "price", event.target.value)
                          }
                        />
                      </FieldBlock>

                      <FieldBlock
                        label={locale === "en" ? "Delivery fee" : "رسوم التوصيل"}
                        helper={
                          locale === "en"
                            ? "Used by operations and client-facing totals."
                            : "تُستخدم في التشغيل وفي الإجماليات الظاهرة للعميل."
                        }
                      >
                        <input
                          type="number"
                          step="0.001"
                          className={cn(fieldClass(isEditing), "numeric-ltr")}
                          disabled={!isEditing}
                          value={draft.deliveryFee || ""}
                          onChange={(event) =>
                            updateDraft(product.id, "deliveryFee", event.target.value)
                          }
                        />
                      </FieldBlock>

                      <FieldBlock
                        label={locale === "en" ? "Catalog code" : "رمز المنتج"}
                        helper={
                          locale === "en"
                            ? "Read-only operational reference."
                            : "مرجع تشغيلي للقراءة فقط."
                        }
                      >
                        <div className="input-premium flex items-center bg-slate-50 text-sm font-semibold text-slate-500">
                          {product.code}
                        </div>
                      </FieldBlock>
                    </div>
                  </SectionCard>

                  <SectionCard
                    icon={FileText}
                    title={
                      locale === "en"
                        ? "Operational visibility and notes"
                        : "الظهور التشغيلي والملاحظات"
                    }
                    description={
                      locale === "en"
                        ? "Control whether the product is visible to operations and keep clear notes for dispatchers and admins."
                        : "تحكم في ظهور المنتج للتشغيل واحتفظ بملاحظات واضحة للمشغلين والإدارة."
                    }
                  >
                    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                      <div className="rounded-[26px] border border-slate-100 bg-white/88 p-4 shadow-[0_18px_32px_-34px_rgba(15,23,42,0.18)]">
                        <p className="text-sm font-semibold text-slate-700">
                          {locale === "en" ? "Availability" : "التوفر"}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          {availabilityHint(locale, draft.isAvailable)}
                        </p>

                        <button
                          type="button"
                          disabled={!isEditing}
                          aria-pressed={Boolean(draft.isAvailable)}
                          onClick={() =>
                            updateDraft(
                              product.id,
                              "isAvailable",
                              !Boolean(draft.isAvailable)
                            )
                          }
                          className={cn(
                            "mt-4 flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-sm font-semibold transition",
                            isEditing
                              ? "border-brand-200 bg-white text-slate-800 hover:border-brand-300"
                              : "cursor-default border-slate-100 bg-slate-50 text-slate-500",
                            draft.isAvailable &&
                              isEditing &&
                              "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                          )}
                        >
                          <span>
                            {draft.isAvailable
                              ? locale === "en"
                                ? "Visible in catalog"
                                : "ظاهر في الكتالوج"
                              : locale === "en"
                                ? "Hidden from catalog"
                                : "مخفي من الكتالوج"}
                          </span>
                          <span
                            className={cn(
                              "relative flex h-7 w-12 items-center rounded-full px-1 transition",
                              draft.isAvailable
                                ? "bg-emerald-500/20"
                                : "bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "h-5 w-5 rounded-full bg-white shadow-sm transition",
                                draft.isAvailable
                                  ? isRTL
                                    ? "translate-x-0"
                                    : "translate-x-5"
                                  : isRTL
                                    ? "-translate-x-5"
                                    : "translate-x-0"
                              )}
                            />
                          </span>
                        </button>

                        <div className="mt-4 rounded-[22px] border border-slate-100 bg-slate-50/85 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {locale === "en" ? "Change state" : "حالة التعديل"}
                          </p>
                          <p className="mt-3 text-sm font-semibold text-slate-900">
                            {isEditing
                              ? isDirty
                                ? locale === "en"
                                  ? "This card contains pending edits."
                                  : "تحتوي هذه البطاقة على تعديلات معلقة."
                                : locale === "en"
                                  ? "Edit mode is open with no pending changes."
                                  : "وضع التعديل مفتوح ولا توجد تغييرات معلقة."
                              : locale === "en"
                                ? "The card is currently locked for review."
                                : "هذه البطاقة في وضع مراجعة فقط حالياً."}
                          </p>
                        </div>
                      </div>

                      <FieldBlock
                        label={
                          locale === "en"
                            ? "Operational notes"
                            : "ملاحظات تشغيلية"
                        }
                        helper={
                          locale === "en"
                            ? "Write guidance that helps dispatchers, dashboard users, and support staff understand when to prioritize or hide this cylinder."
                            : "اكتب ملاحظات تساعد المشغلين والمستخدمين داخل اللوحة والدعم على معرفة متى يجب تفضيل هذا المنتج أو إخفاؤه."
                        }
                      >
                        <textarea
                          className={textareaClass(isEditing)}
                          disabled={!isEditing}
                          value={draft.operationalNotes || ""}
                          onChange={(event) =>
                            updateDraft(
                              product.id,
                              "operationalNotes",
                              event.target.value
                            )
                          }
                        />
                      </FieldBlock>
                    </div>
                  </SectionCard>
                </div>

                <aside className="rounded-[30px] border border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-5 shadow-[0_26px_50px_-36px_rgba(15,23,42,0.24)]">
                  <div
                    className={cn(
                      "flex items-start gap-3",
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-brand-50 text-brand-600 shadow-[0_18px_30px_-24px_rgba(255,124,31,0.48)]">
                      <PackageSearch className="h-5 w-5" />
                    </div>
                    <div className={cn("min-w-0 flex-1", isRTL ? "text-right" : "text-left")}>
                      <p className="text-sm font-semibold text-slate-500">
                        {locale === "en" ? "Live product sheet" : "ورقة المنتج المباشرة"}
                      </p>
                      <p className="mt-2 text-lg font-extrabold text-slate-950">
                        {primaryName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{product.code}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <SummaryRow
                      label={locale === "en" ? "Base price" : "السعر الأساسي"}
                      value={formatMoney(draft.price || 0, locale, CURRENCY_CODE)}
                      tone="brand"
                    />
                    <SummaryRow
                      label={locale === "en" ? "Delivery fee" : "رسوم التوصيل"}
                      value={formatMoney(draft.deliveryFee || 0, locale, CURRENCY_CODE)}
                      tone="ocean"
                    />
                    <SummaryRow
                      label={locale === "en" ? "Customer total" : "إجمالي العميل"}
                      value={formatMoney(previewTotal, locale, CURRENCY_CODE)}
                      tone="emerald"
                    />
                    <SummaryRow
                      label={locale === "en" ? "Visibility" : "الظهور"}
                      value={availabilityLabel(locale, draft.isAvailable)}
                    />
                  </div>

                  <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {locale === "en" ? "Notes preview" : "معاينة الملاحظات"}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-600 break-words">
                      {notesPreview ||
                        (locale === "en"
                          ? "No operational notes have been added for this product yet."
                          : "لم تتم إضافة ملاحظات تشغيلية لهذا المنتج بعد.")}
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          disabled={isSaving || !isDirty}
                          onClick={async () => {
                            await onSave(product.id, {
                              ...draft,
                              price: Number(draft.price || 0),
                              deliveryFee: Number(draft.deliveryFee || 0)
                            });
                            setEditing(product.id, false);
                          }}
                          className="button-primary w-full justify-center"
                        >
                          <Save className="h-4 w-4" />
                          {isSaving
                            ? locale === "en"
                              ? "Saving..."
                              : "جارٍ الحفظ..."
                            : locale === "en"
                              ? "Save changes"
                              : "حفظ التغييرات"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            resetDraft(product);
                            setEditing(product.id, false);
                          }}
                          className="button-secondary w-full justify-center"
                        >
                          <X className="h-4 w-4" />
                          {locale === "en"
                            ? "Discard changes"
                            : "إلغاء التغييرات"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(product.id, true)}
                        className="button-secondary w-full justify-center"
                      >
                        <Pencil className="h-4 w-4" />
                        {locale === "en" ? "Edit product" : "تعديل المنتج"}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={async () => {
                        const confirmed = window.confirm(
                          locale === "en"
                            ? `Delete ${product.nameEn || "this product"}?`
                            : `هل تريد حذف المنتج ${product.nameAr || ""}؟`
                        );

                        if (!confirmed) {
                          return;
                        }

                        await onDelete(product.id);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {locale === "en" ? "Delete product" : "حذف المنتج"}
                    </button>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
