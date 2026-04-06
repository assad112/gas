"use client";

import { Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/hooks/use-i18n";

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

export default function PricingTable({
  products,
  savingIds,
  onSave,
  onDelete
}) {
  const { locale } = useI18n();
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
    <div className="grid gap-5">
      {products.map((product) => {
        const draft = drafts[product.id] || {};
        const isSaving = Boolean(savingIds?.[product.id]);
        const isEditing = Boolean(editingIds?.[product.id]);

        return (
          <section key={product.id} className="panel-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">
                  {locale === "en" ? "Product type" : "نوع المنتج"}
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                  {locale === "en" ? product.nameEn : product.nameAr}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{product.code}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.isAvailable)}
                    disabled={!isEditing}
                    onChange={(event) =>
                      updateDraft(product.id, "isAvailable", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-200"
                  />
                  {locale === "en" ? "Available" : "متاح"}
                </label>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      resetDraft(product);
                    }
                    setEditing(product.id, !isEditing);
                  }}
                  className="button-secondary"
                >
                  {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  {isEditing
                    ? locale === "en"
                      ? "Cancel edit"
                      : "إلغاء التعديل"
                    : locale === "en"
                      ? "Edit product"
                      : "تعديل المنتج"}
                </button>

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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {locale === "en" ? "Delete" : "حذف"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {locale === "en" ? "Arabic name" : "الاسم العربي"}
                </label>
                <input
                  className="input-premium"
                  disabled={!isEditing}
                  value={draft.nameAr || ""}
                  onChange={(event) =>
                    updateDraft(product.id, "nameAr", event.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {locale === "en" ? "English name" : "الاسم الإنجليزي"}
                </label>
                <input
                  className="input-premium"
                  disabled={!isEditing}
                  value={draft.nameEn || ""}
                  onChange={(event) =>
                    updateDraft(product.id, "nameEn", event.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {locale === "en" ? "Size label" : "الحجم"}
                </label>
                <input
                  className="input-premium"
                  disabled={!isEditing}
                  value={draft.sizeLabel || ""}
                  onChange={(event) =>
                    updateDraft(product.id, "sizeLabel", event.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {locale === "en" ? "Price" : "السعر"}
                </label>
                <input
                  type="number"
                  step="0.001"
                  className="input-premium numeric-ltr"
                  disabled={!isEditing}
                  value={draft.price || ""}
                  onChange={(event) =>
                    updateDraft(product.id, "price", event.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {locale === "en" ? "Delivery fee" : "رسوم التوصيل"}
                </label>
                <input
                  type="number"
                  step="0.001"
                  className="input-premium numeric-ltr"
                  disabled={!isEditing}
                  value={draft.deliveryFee || ""}
                  onChange={(event) =>
                    updateDraft(product.id, "deliveryFee", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {locale === "en" ? "Operational notes" : "ملاحظات تشغيلية"}
              </label>
              <textarea
                className="min-h-[112px] w-full rounded-[24px] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                disabled={!isEditing}
                value={draft.operationalNotes || ""}
                onChange={(event) =>
                  updateDraft(product.id, "operationalNotes", event.target.value)
                }
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isSaving || !isEditing}
                onClick={async () => {
                  await onSave(product.id, {
                    ...draft,
                    price: Number(draft.price || 0),
                    deliveryFee: Number(draft.deliveryFee || 0)
                  });
                  setEditing(product.id, false);
                }}
                className="button-primary w-full sm:w-auto"
              >
                <Save className="h-4 w-4" />
                {isSaving
                  ? locale === "en"
                    ? "Saving..."
                    : "جاري الحفظ..."
                  : locale === "en"
                    ? "Save product"
                    : "حفظ المنتج"}
              </button>

              {isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    resetDraft(product);
                    setEditing(product.id, false);
                  }}
                  className="button-secondary w-full sm:w-auto"
                >
                  <X className="h-4 w-4" />
                  {locale === "en" ? "Discard changes" : "إلغاء التغييرات"}
                </button>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
