"use client";

import Link from "next/link";
import {
  Clock3,
  FileText,
  MapPinned,
  Navigation,
  Pencil,
  Save,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/hooks/use-i18n";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const CURRENCY_CODE = "OMR";

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

function hasDraftChanges(zone, draft) {
  if (!draft) {
    return false;
  }

  return (
    draft.nameAr !== zone.nameAr ||
    draft.nameEn !== zone.nameEn ||
    draft.governorate !== zone.governorate ||
    Number(draft.deliveryFee || 0) !== Number(zone.deliveryFee || 0) ||
    Number(draft.estimatedDeliveryMinutes || 0) !==
      Number(zone.estimatedDeliveryMinutes || 0) ||
    Boolean(draft.isActive) !== Boolean(zone.isActive) ||
    (draft.operationalNotes || "") !== (zone.operationalNotes || "")
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
    "min-h-[160px] w-full rounded-[24px] border px-4 py-3 text-sm text-slate-900 outline-none transition",
    isEditing
      ? "border-slate-200 bg-white/90 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
      : "cursor-default border-slate-100 bg-slate-50/80 text-slate-700"
  );
}

function getPointCount(polygon = []) {
  const points = Array.isArray(polygon)
    ? polygon.filter(
        (point) =>
          Number.isFinite(Number(point?.latitude)) &&
          Number.isFinite(Number(point?.longitude))
      )
    : [];

  if (points.length < 2) {
    return points.length;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const closed =
    Number(first.latitude) === Number(last.latitude) &&
    Number(first.longitude) === Number(last.longitude);

  return closed ? points.length - 1 : points.length;
}

function formatCoordinate(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue.toFixed(5) : "--";
}

function MetricCard({ label, value, helper, tone = "slate", icon: Icon }) {
  const tones = {
    slate: "border-slate-200 bg-white/82 text-slate-900",
    brand: "border-brand-100 bg-brand-50/75 text-brand-900",
    ocean: "border-ocean-100 bg-ocean-50/75 text-ocean-900",
    emerald: "border-emerald-100 bg-emerald-50/75 text-emerald-900"
  };

  return (
    <div
      className={cn(
        "rounded-[24px] border p-4 shadow-[0_22px_40px_-36px_rgba(15,23,42,0.24)]",
        tones[tone] || tones.slate
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function FieldCard({ label, helper, children }) {
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
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    brand: "bg-brand-50 text-brand-700",
    ocean: "bg-ocean-50 text-ocean-700",
    emerald: "bg-emerald-50 text-emerald-700"
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-100 bg-white/88 px-4 py-3">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className={cn("rounded-full px-3 py-1 text-sm font-bold", tones[tone])}>
        {value}
      </span>
    </div>
  );
}

export default function ZonesTable({ zones, savingIds, onSave, onDelete }) {
  const { locale, isRTL } = useI18n();
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

  function resetDraft(zone) {
    setDrafts((current) => ({
      ...current,
      [zone.id]: buildDraft(zone)
    }));
  }

  return (
    <div className="grid gap-6">
      {zones.map((zone) => {
        const draft = drafts[zone.id] || {};
        const isSaving = Boolean(savingIds?.[zone.id]);
        const isEditing = Boolean(editingIds?.[zone.id]);
        const isDirty = hasDraftChanges(zone, draft);
        const primaryName = locale === "en" ? zone.nameEn : zone.nameAr;
        const secondaryName = locale === "en" ? zone.nameAr : zone.nameEn;
        const pointCount = getPointCount(zone.polygon);
        const hasPolygon = pointCount >= 3;
        const hasCenter =
          zone.centerLatitude !== null && zone.centerLongitude !== null;
        const statusText =
          locale === "en"
            ? draft.isActive
              ? "Active for delivery"
              : "Inactive coverage"
            : draft.isActive
              ? "نشطة للتوصيل"
              : "تغطية غير نشطة";

        return (
          <section
            key={zone.id}
            className={cn(
              "panel-surface overflow-hidden p-0",
              isEditing &&
                "border-ocean-200 shadow-[0_28px_80px_-42px_rgba(14,165,233,0.3)]"
            )}
          >
            <div className="relative overflow-hidden border-b border-slate-100">
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-36",
                  draft.isActive
                    ? "bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_42%),radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))]"
                    : "bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.24),transparent_42%),radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))]"
                )}
              />

              <div className="relative z-10 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {zone.code}
                  </span>
                  {zone.governorate ? (
                    <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {zone.governorate}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      draft.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    )}
                  >
                    {statusText}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      hasPolygon
                        ? "border-ocean-200 bg-ocean-50 text-ocean-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    )}
                  >
                    {hasPolygon
                      ? locale === "en"
                        ? "Polygon ready"
                        : "المضلع جاهز"
                      : locale === "en"
                        ? "Polygon missing"
                        : "المضلع غير مكتمل"}
                  </span>
                  {isDirty ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {locale === "en" ? "Unsaved changes" : "تغييرات غير محفوظة"}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="min-w-0">
                    <p className="eyebrow-label">
                      {locale === "en" ? "Coverage zone card" : "بطاقة منطقة التغطية"}
                    </p>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-[2rem]">
                      {primaryName}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {secondaryName}
                    </p>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                      {draft.isActive
                        ? locale === "en"
                          ? "This zone is live in the delivery network and should keep fee, ETA, and governorate coverage aligned with operations."
                          : "هذه المنطقة تعمل ضمن شبكة التوصيل ويجب أن تبقى رسومها ووقتها المتوقع وتغطيتها متوافقة مع التشغيل."
                        : locale === "en"
                          ? "This zone remains on standby until it is reactivated for live delivery."
                          : "تبقى هذه المنطقة في وضع الاستعداد حتى تتم إعادة تفعيلها ضمن التوصيل المباشر."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      label={locale === "en" ? "Delivery fee" : "رسوم التوصيل"}
                      value={formatMoney(draft.deliveryFee || 0, locale, CURRENCY_CODE)}
                      helper={locale === "en" ? "Operational fee." : "الرسوم التشغيلية."}
                      tone="brand"
                      icon={Navigation}
                    />
                    <MetricCard
                      label={locale === "en" ? "ETA" : "الوقت المتوقع"}
                      value={`${formatNumber(
                        draft.estimatedDeliveryMinutes || 0,
                        locale
                      )} ${locale === "en" ? "min" : "دقيقة"}`}
                      helper={locale === "en" ? "Expected SLA." : "المدة المتوقعة."}
                      tone="ocean"
                      icon={Clock3}
                    />
                    <MetricCard
                      label={locale === "en" ? "Polygon points" : "نقاط المضلع"}
                      value={formatNumber(pointCount, locale)}
                      helper={
                        hasPolygon
                          ? locale === "en"
                            ? "Geometry configured."
                            : "الهندسة الجغرافية مضبوطة."
                          : locale === "en"
                            ? "Complete it from the map."
                            : "أكمله من الخريطة."
                      }
                      tone="emerald"
                      icon={MapPinned}
                    />
                    <MetricCard
                      label={locale === "en" ? "Center point" : "نقطة المركز"}
                      value={
                        hasCenter
                          ? `${formatCoordinate(zone.centerLatitude)}, ${formatCoordinate(
                              zone.centerLongitude
                            )}`
                          : "--"
                      }
                      helper={
                        hasCenter
                          ? locale === "en"
                            ? "Ready for map focus."
                            : "جاهز للتركيز على الخريطة."
                          : locale === "en"
                            ? "No center stored yet."
                            : "لا يوجد مركز محفوظ بعد."
                      }
                      tone="slate"
                      icon={Navigation}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_330px]">
                <div className="space-y-5">
                  <section className="rounded-[30px] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,0.96))] p-5 shadow-[0_22px_40px_-36px_rgba(15,23,42,0.22)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-slate-900 text-white">
                        <MapPinned className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-950">
                          {locale === "en" ? "Coverage identity" : "هوية التغطية"}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          {locale === "en"
                            ? "Manage bilingual naming, governorate ownership, and the live identity shown across the delivery network."
                            : "أدر الاسم باللغتين والمحافظة والهوية التي تظهر عبر شبكة التوصيل."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <FieldCard label={locale === "en" ? "Arabic name" : "الاسم العربي"}>
                        <input
                          className={fieldClass(isEditing)}
                          disabled={!isEditing}
                          value={draft.nameAr || ""}
                          onChange={(event) =>
                            updateDraft(zone.id, "nameAr", event.target.value)
                          }
                        />
                      </FieldCard>

                      <FieldCard label={locale === "en" ? "English name" : "الاسم الإنجليزي"}>
                        <input
                          className={fieldClass(isEditing)}
                          disabled={!isEditing}
                          value={draft.nameEn || ""}
                          onChange={(event) =>
                            updateDraft(zone.id, "nameEn", event.target.value)
                          }
                        />
                      </FieldCard>

                      <FieldCard
                        label={locale === "en" ? "Governorate" : "المحافظة"}
                        helper={
                          locale === "en"
                            ? "Groups the coverage operationally."
                            : "تجمع التغطية تشغيلياً."
                        }
                      >
                        <input
                          className={fieldClass(isEditing)}
                          disabled={!isEditing}
                          value={draft.governorate || ""}
                          onChange={(event) =>
                            updateDraft(zone.id, "governorate", event.target.value)
                          }
                        />
                      </FieldCard>

                      <FieldCard
                        label={locale === "en" ? "Delivery fee" : "رسوم التوصيل"}
                        helper={
                          locale === "en" ? "Stored in OMR." : "تُحفظ بالريال العماني."
                        }
                      >
                        <input
                          type="number"
                          step="0.001"
                          className={cn(fieldClass(isEditing), "numeric-ltr")}
                          disabled={!isEditing}
                          value={draft.deliveryFee || ""}
                          onChange={(event) =>
                            updateDraft(zone.id, "deliveryFee", event.target.value)
                          }
                        />
                      </FieldCard>

                      <FieldCard
                        label={locale === "en" ? "ETA in minutes" : "الوقت المتوقع بالدقائق"}
                        helper={
                          locale === "en" ? "Expected service time." : "المدة المتوقعة."
                        }
                      >
                        <input
                          type="number"
                          className={cn(fieldClass(isEditing), "numeric-ltr")}
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
                      </FieldCard>

                      <FieldCard
                        label={locale === "en" ? "Zone code" : "رمز المنطقة"}
                        helper={
                          locale === "en" ? "Read-only reference." : "مرجع للقراءة فقط."
                        }
                      >
                        <div className="input-premium flex items-center bg-slate-50 text-sm font-semibold text-slate-500">
                          {zone.code}
                        </div>
                      </FieldCard>
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,0.96))] p-5 shadow-[0_22px_40px_-36px_rgba(15,23,42,0.22)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-slate-900 text-white">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-950">
                          {locale === "en"
                            ? "Coverage readiness and notes"
                            : "جاهزية التغطية والملاحظات"}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          {locale === "en"
                            ? "Control activation and keep a clear note for dispatchers and admins."
                            : "تحكم في التفعيل واحتفظ بملاحظة واضحة للمشغلين والإدارة."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                      <div className="rounded-[26px] border border-slate-100 bg-white/88 p-4 shadow-[0_18px_32px_-34px_rgba(15,23,42,0.18)]">
                        <p className="text-sm font-semibold text-slate-700">
                          {locale === "en" ? "Activation state" : "حالة التفعيل"}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          {locale === "en"
                            ? draft.isActive
                              ? "Available now in the live delivery network."
                              : "Hidden until the zone is reactivated."
                            : draft.isActive
                              ? "متاحة الآن ضمن شبكة التوصيل المباشرة."
                              : "مخفية حتى تتم إعادة تفعيل المنطقة."}
                        </p>
                        <label
                          className={cn(
                            "mt-4 flex items-center justify-between rounded-[22px] border px-4 py-3 text-sm font-semibold",
                            isEditing
                              ? "border-brand-200 bg-white text-slate-800"
                              : "border-slate-100 bg-slate-50 text-slate-500"
                          )}
                        >
                          <span>{statusText}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(draft.isActive)}
                            disabled={!isEditing}
                            onChange={(event) =>
                              updateDraft(zone.id, "isActive", event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-200"
                          />
                        </label>
                      </div>

                      <FieldCard
                        label={
                          locale === "en" ? "Operational notes" : "ملاحظات تشغيلية"
                        }
                        helper={
                          locale === "en"
                            ? "Describe demand, constraints, or exceptions for this area."
                            : "صف طبيعة الطلب أو القيود أو الاستثناءات لهذه المنطقة."
                        }
                      >
                        <textarea
                          className={textareaClass(isEditing)}
                          disabled={!isEditing}
                          value={draft.operationalNotes || ""}
                          onChange={(event) =>
                            updateDraft(zone.id, "operationalNotes", event.target.value)
                          }
                        />
                      </FieldCard>
                    </div>
                  </section>
                </div>

                <aside className="rounded-[30px] border border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-5 shadow-[0_26px_50px_-36px_rgba(15,23,42,0.24)]">
                  <div
                    className={cn(
                      "flex items-start gap-3",
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-ocean-50 text-ocean-600 shadow-[0_18px_30px_-24px_rgba(14,165,233,0.5)]">
                      <MapPinned className="h-5 w-5" />
                    </div>
                    <div className={cn("min-w-0 flex-1", isRTL ? "text-right" : "text-left")}>
                      <p className="text-sm font-semibold text-slate-500">
                        {locale === "en" ? "Live zone sheet" : "ورقة المنطقة المباشرة"}
                      </p>
                      <p className="mt-2 text-lg font-extrabold text-slate-950">
                        {primaryName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{zone.code}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <SummaryRow
                      label={locale === "en" ? "Delivery fee" : "رسوم التوصيل"}
                      value={formatMoney(draft.deliveryFee || 0, locale, CURRENCY_CODE)}
                      tone="brand"
                    />
                    <SummaryRow
                      label={locale === "en" ? "ETA" : "الوقت المتوقع"}
                      value={`${formatNumber(
                        draft.estimatedDeliveryMinutes || 0,
                        locale
                      )} ${locale === "en" ? "min" : "دقيقة"}`}
                      tone="ocean"
                    />
                    <SummaryRow
                      label={locale === "en" ? "Coverage status" : "حالة التغطية"}
                      value={statusText}
                      tone={draft.isActive ? "emerald" : "slate"}
                    />
                    <SummaryRow
                      label={locale === "en" ? "Polygon points" : "نقاط المضلع"}
                      value={formatNumber(pointCount, locale)}
                    />
                  </div>

                  <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {locale === "en" ? "Center coordinates" : "إحداثيات المركز"}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      {hasCenter
                        ? `${formatCoordinate(zone.centerLatitude)}, ${formatCoordinate(
                            zone.centerLongitude
                          )}`
                        : locale === "en"
                          ? "No center stored"
                          : "لا يوجد مركز محفوظ"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-500 break-words">
                      {hasPolygon
                        ? locale === "en"
                          ? "Polygon geometry is configured for this zone."
                          : "الهندسة الجغرافية للمضلع مضبوطة لهذه المنطقة."
                        : locale === "en"
                          ? "This zone still needs polygon setup from the map workspace."
                          : "هذه المنطقة ما زالت تحتاج إلى إعداد المضلع من مساحة الخريطة."}
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          disabled={isSaving || !isDirty}
                          onClick={async () => {
                            await onSave(zone.id, {
                              ...draft,
                              deliveryFee: Number(draft.deliveryFee || 0),
                              estimatedDeliveryMinutes: Number(
                                draft.estimatedDeliveryMinutes || 0
                              )
                            });
                            setEditingIds((current) => ({
                              ...current,
                              [zone.id]: false
                            }));
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
                            resetDraft(zone);
                            setEditingIds((current) => ({
                              ...current,
                              [zone.id]: false
                            }));
                          }}
                          className="button-secondary w-full justify-center"
                        >
                          <X className="h-4 w-4" />
                          {locale === "en" ? "Discard changes" : "إلغاء التغييرات"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingIds((current) => ({ ...current, [zone.id]: true }))
                        }
                        className="button-secondary w-full justify-center"
                      >
                        <Pencil className="h-4 w-4" />
                        {locale === "en" ? "Edit zone" : "تعديل المنطقة"}
                      </button>
                    )}

                    <Link href="/map" className="button-secondary w-full justify-center">
                      <MapPinned className="h-4 w-4" />
                      {locale === "en" ? "Open map workspace" : "فتح مساحة الخريطة"}
                    </Link>

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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {locale === "en" ? "Delete zone" : "حذف المنطقة"}
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
