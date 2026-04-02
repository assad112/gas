"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/hooks/use-i18n";

function buildInitialState(zones) {
  return zones.reduce((accumulator, zone) => {
    accumulator[zone.id] = {
      nameAr: zone.nameAr,
      nameEn: zone.nameEn,
      governorate: zone.governorate,
      deliveryFee: String(zone.deliveryFee),
      estimatedDeliveryMinutes: String(zone.estimatedDeliveryMinutes),
      isActive: zone.isActive,
      operationalNotes: zone.operationalNotes || ""
    };
    return accumulator;
  }, {});
}

export default function ZonesTable({ zones, savingIds, onSave }) {
  const { locale } = useI18n();
  const [drafts, setDrafts] = useState(() => buildInitialState(zones));

  useEffect(() => {
    setDrafts(buildInitialState(zones));
  }, [zones]);

  function updateDraft(zoneId, key, value) {
    setDrafts((current) => ({
      ...current,
      [zoneId]: {
        ...current[zoneId],
        [key]: value
      }
    }));
  }

  return (
    <div className="grid gap-5">
      {zones.map((zone) => {
        const draft = drafts[zone.id] || {};
        const isSaving = Boolean(savingIds?.[zone.id]);

        return (
          <section key={zone.id} className="panel-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">
                  {locale === "en" ? "Delivery zone" : "منطقة توصيل"}
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                  {locale === "en" ? zone.nameEn : zone.nameAr}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{zone.code}</p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(draft.isActive)}
                  onChange={(event) =>
                    updateDraft(zone.id, "isActive", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-200"
                />
                {locale === "en" ? "Active" : "مفعلة"}
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
                    updateDraft(zone.id, "nameAr", event.target.value)
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
                    updateDraft(zone.id, "nameEn", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {locale === "en" ? "Governorate" : "المحافظة"}
                </label>
                <input
                  className="input-premium"
                  value={draft.governorate || ""}
                  onChange={(event) =>
                    updateDraft(zone.id, "governorate", event.target.value)
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
                    updateDraft(zone.id, "deliveryFee", event.target.value)
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {locale === "en" ? "ETA in minutes" : "الوقت المتوقع بالدقائق"}
                </label>
                <input
                  type="number"
                  className="input-premium numeric-ltr"
                  value={draft.estimatedDeliveryMinutes || ""}
                  onChange={(event) =>
                    updateDraft(
                      zone.id,
                      "estimatedDeliveryMinutes",
                      event.target.value
                    )
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
                  updateDraft(zone.id, "operationalNotes", event.target.value)
                }
              />
            </div>

            <div className="mt-5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  onSave(zone.id, {
                    ...draft,
                    deliveryFee: Number(draft.deliveryFee || 0),
                    estimatedDeliveryMinutes: Number(
                      draft.estimatedDeliveryMinutes || 0
                    )
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
                    ? "Save zone"
                    : "حفظ المنطقة"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
