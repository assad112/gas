"use client";

import { Save, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/empty-state";
import StatusBadge from "@/components/shared/status-badge";
import { useI18n } from "@/hooks/use-i18n";
import {
  formatDateTime,
  formatMoney,
  getPaymentMethodLabel
} from "@/lib/format";

const paymentMethods = ["cash_on_delivery", "cash", "card", "online"];

function toFormState(order) {
  return {
    status: order?.status || "pending",
    assignedDriverId: order?.assignedDriverId ?? "",
    paymentMethod: order?.paymentMethod || "cash_on_delivery",
    preferredDeliveryWindow: order?.preferredDeliveryWindow || "",
    notes: order?.notes || "",
    totalAmount:
      order?.totalAmount === null || order?.totalAmount === undefined
        ? ""
        : String(order.totalAmount)
  };
}

function getStatusLabel(status, locale) {
  if (status === "pending") {
    return locale === "en" ? "Pending" : "معلّقة";
  }

  if (status === "accepted") {
    return locale === "en" ? "Accepted" : "مقبولة";
  }

  if (status === "delivered") {
    return locale === "en" ? "Delivered" : "مكتملة";
  }

  if (status === "cancelled") {
    return locale === "en" ? "Cancelled" : "ملغاة";
  }

  return status;
}

function getEditableStatusesForAdmin(currentStatus) {
  if (currentStatus === "pending") {
    return ["pending", "cancelled"];
  }

  if (currentStatus === "accepted") {
    return ["accepted", "delivered", "cancelled"];
  }

  if (currentStatus === "delivered") {
    return ["delivered"];
  }

  if (currentStatus === "cancelled") {
    return ["cancelled"];
  }

  return ["pending", "cancelled"];
}

export default function OrderDetailsPanel({
  order,
  drivers,
  settings,
  busy,
  onSave,
  onCancel
}) {
  const { locale } = useI18n();
  const [formState, setFormState] = useState(() => toFormState(order));

  useEffect(() => {
    setFormState(toFormState(order));
  }, [order?.id, order?.updatedAt, order?.status]);

  const editableStatuses = useMemo(
    () => getEditableStatusesForAdmin(order?.status),
    [order?.status]
  );

  if (!order) {
    return (
      <EmptyState
        title={locale === "en" ? "Select an order" : "اختر طلبًا"}
        description={
          locale === "en"
            ? "Pick any order from the live list to review details and update its operational state."
            : "اختر أي طلب من القائمة الحية لمراجعة التفاصيل وتحديث حالته التشغيلية."
        }
      />
    );
  }

  const canCancel = !["delivered", "cancelled"].includes(order.status);
  const statusLocked = ["delivered", "cancelled"].includes(order.status);

  async function handleSubmit(event) {
    event.preventDefault();

    await onSave(order.id, {
      status: formState.status,
      assignedDriverId:
        formState.assignedDriverId === "" ? null : Number(formState.assignedDriverId),
      paymentMethod: formState.paymentMethod,
      preferredDeliveryWindow: formState.preferredDeliveryWindow,
      notes: formState.notes.trim(),
      totalAmount:
        formState.totalAmount === "" ? null : Number(formState.totalAmount)
    });
  }

  return (
    <section className="panel-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow-label">
            {locale === "en" ? "Order details" : "تفاصيل الطلب"}
          </p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900">
            <span className="numeric-ltr">#{order.id}</span> - {order.name}
          </h2>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold text-slate-500">
            {locale === "en" ? "Customer" : "العميل"}
          </p>
          <p className="mt-2 font-semibold text-slate-900">{order.name}</p>
          <p className="numeric-ltr mt-1 text-sm text-slate-500">{order.phone}</p>
          {order.customerEmail ? (
            <p className="mt-1 text-sm text-slate-500">{order.customerEmail}</p>
          ) : null}
        </div>

        <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold text-slate-500">
            {locale === "en" ? "Created at" : "وقت الطلب"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatDateTime(order.createdAt, locale)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {locale === "en" ? "Last update" : "آخر تحديث"}:{" "}
            {formatDateTime(order.updatedAt, locale)}
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 sm:col-span-2">
          <p className="text-xs font-semibold text-slate-500">
            {locale === "en" ? "Full address" : "العنوان الكامل"}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {order.addressFull || order.location}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "Status" : "الحالة"}
            </label>
            <select
              className="select-premium"
              value={formState.status}
              disabled={statusLocked}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  status: event.target.value
                }))
              }
            >
              {editableStatuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status, locale)}
                </option>
              ))}
            </select>

            {order.status === "pending" ? (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                {locale === "en"
                  ? "Pending order acceptance is done by driver app only."
                  : "قبول الطلب المعلّق يتم فقط من تطبيق السائق."}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "Assigned driver" : "السائق المعيّن"}
            </label>
            <select
              className="select-premium"
              value={formState.assignedDriverId}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  assignedDriverId: event.target.value
                }))
              }
            >
              <option value="">
                {locale === "en" ? "Unassigned" : "غير معيّن"}
              </option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}{" "}
                  {driver.status === "online"
                    ? locale === "en"
                      ? "• online"
                      : "• متصل"
                    : locale === "en"
                      ? "• offline"
                      : "• غير متصل"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "Payment method" : "طريقة الدفع"}
            </label>
            <select
              className="select-premium"
              value={formState.paymentMethod}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  paymentMethod: event.target.value
                }))
              }
            >
              {paymentMethods.map((paymentMethod) => (
                <option key={paymentMethod} value={paymentMethod}>
                  {getPaymentMethodLabel(paymentMethod, locale)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "Preferred window" : "نافذة التوصيل"}
            </label>
            <input
              className="input-premium"
              value={formState.preferredDeliveryWindow}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  preferredDeliveryWindow: event.target.value
                }))
              }
              placeholder={
                locale === "en" ? "e.g. 6:00 PM - 8:00 PM" : "مثال: 6:00 م - 8:00 م"
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "Cylinder type" : "نوع الأسطوانة"}
            </label>
            <div className="input-premium flex items-center bg-slate-50 text-slate-600">
              {order.gasType}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {locale === "en" ? "Total amount" : "الإجمالي"}
            </label>
            <input
              type="number"
              step="0.001"
              className="input-premium numeric-ltr"
              value={formState.totalAmount}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  totalAmount: event.target.value
                }))
              }
              placeholder={formatMoney(0, locale, settings?.currencyCode || "OMR")}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {locale === "en" ? "Operational notes" : "ملاحظات تشغيلية"}
          </label>
          <textarea
            className="min-h-[128px] w-full rounded-[24px] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            value={formState.notes}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                notes: event.target.value
              }))
            }
            placeholder={
              locale === "en"
                ? "Delivery instructions, cancellation reason, operator notes..."
                : "تعليمات التوصيل، سبب الإلغاء، ملاحظات المشغل..."
            }
          />
        </div>

        <div className="grid gap-4 rounded-[24px] border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              {locale === "en" ? "Driver location" : "موقع السائق"}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {order.driverLocation ||
                (locale === "en" ? "Not available yet" : "غير متوفر بعد")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              {locale === "en" ? "Current driver" : "السائق الحالي"}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {order.driverName || (locale === "en" ? "Unassigned" : "غير معيّن")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="submit" disabled={busy} className="button-primary w-full sm:w-auto">
            <Save className="h-4 w-4" />
            {locale === "en" ? "Save changes" : "حفظ التعديلات"}
          </button>

          <button
            type="button"
            disabled={!canCancel || busy}
            onClick={() => onCancel(order.id)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition sm:w-auto ${
              canCancel
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "cursor-not-allowed bg-slate-100 text-slate-400"
            }`}
          >
            <XCircle className="h-4 w-4" />
            {locale === "en" ? "Cancel order" : "إلغاء الطلب"}
          </button>
        </div>
      </form>
    </section>
  );
}
