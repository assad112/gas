"use client";

import { Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/hooks/use-i18n";

function buildDraft(zone) {
  return {
    nameAr: zone.nameAr,
    nameEn: zone.nameEn,
    governorate: zone.governorate,
    deliveryFee: String(zone.deliveryFee),
    estimatedDeliveryMinutes: String(zone.estimatedDeliveryMinutes),
    isActive: zone.isActive,
    operationalNotes: zone.operationalNotes || ""
  };
}

function buildInitialState(zones) {
  return zones.reduce((accumulator, zone) => {
    accumulator[zone.id] = buildDraft(zone);
    return accumulator;
  }, {});
}

export default function ZonesTable({ zones, savingIds, onSave, onDelete }) {
  const { locale } = useI18n();
  const [drafts, setDrafts] = useState(() => buildInitialState(zones));
  const [editingIds, setEditingIds] = useState({});

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

  function setEditing(zoneId, isEditing) {
    setEditingIds((current) => ({
      ...current,
      [zoneId]: isEditing
    }));
  }

  function resetDraft(zone) {
    setDrafts((current) => ({
      ...current,
      [zone.id]: buildDraft(zone)
    }));
  }

  return (
    <div className="grid gap-5">
      {zones.map((zone) => {
        const draft = drafts[zone.id] || {};
        const isSaving = Boolean(savingIds?.[zone.id]);
        const isEditing = Boolean(editingIds?.[zone.id]);

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

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.isActive)}
                    disabled={!isEditing}
                    onChange={(event) =>
                      updateDraft(zone.id, "isActive", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-200"
                  />
                  {locale === "en" ? "Active" : "مفعلة"}
                </label>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      resetDraft(zone);
                    }
                    setEditing(zone.id, !isEditing);
                  }}
                  className="button-secondary"
                >
                  {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  {isEditing
                    ? locale === "en"
                      ? "Cancel edit"
                      : "إلغاء التعديل"
                    : locale === "en"
                      ? "Edit zone"
                      : "تعديل المنطقة"}
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={async () => {
                    const confirmed = window.confirm(
                      locale === "en"
                        ? `Delete ${zone.nameEn || "this zone"}?`
                        : `هل تريد حذف المنطقة ${zone.nameAr || ""}؟`
                    );

                    if (!confirmed) {
                      return;
                    }

                    await onDelete(zone.id);
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                disabled={!isEditing}
                value={draft.operationalNotes || ""}
                onChange={(event) =>
                  updateDraft(zone.id, "operationalNotes", event.target.value)
                }
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isSaving || !isEditing}
                onClick={async () => {
                  await onSave(zone.id, {
                    ...draft,
                    deliveryFee: Number(draft.deliveryFee || 0),
                    estimatedDeliveryMinutes: Number(
                      draft.estimatedDeliveryMinutes || 0
                    )
                  });
                  setEditing(zone.id, false);
                }}
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

              {isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    resetDraft(zone);
                    setEditing(zone.id, false);
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
