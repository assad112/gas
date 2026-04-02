"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/hooks/use-i18n";

function buildInitialState(products) {
  return products.reduce((accumulator, product) => {
    accumulator[product.id] = {
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      sizeLabel: product.sizeLabel,
      price: String(product.price),
      deliveryFee: String(product.deliveryFee),
      isAvailable: product.isAvailable,
      operationalNotes: product.operationalNotes || ""
    };
    return accumulator;
  }, {});
}

export default function PricingTable({
  products,
  savingIds,
  onSave
}) {
  const { locale } = useI18n();
  const [drafts, setDrafts] = useState(() => buildInitialState(products));

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

  return (
    <div className="grid gap-5">
      {products.map((product) => {
        const draft = drafts[product.id] || {};
        const isSaving = Boolean(savingIds?.[product.id]);

        return (
          <section key={product.id} className="panel-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">
                  {locale === "en" ? "Cylinder type" : "نوع الأسطوانة"}
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                  {locale === "en" ? product.nameEn : product.nameAr}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{product.code}</p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(draft.isAvailable)}
                  onChange={(event) =>
                    updateDraft(product.id, "isAvailable", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-200"
                />
                {locale === "en" ? "Available" : "متاح"}
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {locale === "en" ? "Arabic name" : "الاسم العربي"}
                </label>
                <input
                  className="input-premium"
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
                value={draft.operationalNotes || ""}
                onChange={(event) =>
                  updateDraft(product.id, "operationalNotes", event.target.value)
                }
              />
            </div>

            <div className="mt-5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  onSave(product.id, {
                    ...draft,
                    price: Number(draft.price || 0),
                    deliveryFee: Number(draft.deliveryFee || 0)
                  })
                }
                className="button-primary w-full sm:w-auto"
              >
                <Save className="h-4 w-4" />
                {isSaving
                  ? locale === "en"
                    ? "Saving..."
                    : "جاري الحفظ..."
                  : locale === "en"
                    ? "Save pricing"
                    : "حفظ التسعير"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
