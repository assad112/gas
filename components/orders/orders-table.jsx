"use client";

import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Truck,
  UserRound
} from "lucide-react";

import StatusBadge from "@/components/shared/status-badge";
import { useI18n } from "@/hooks/use-i18n";
import { formatDateTime, getPaymentMethodLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="break-words text-sm font-semibold leading-6 text-slate-700">{value}</p>
    </div>
  );
}

export default function OrdersTable({
  orders,
  selectedOrderId,
  onSelectOrder,
  onAdvanceStatus,
  busyOrderIds
}) {
  const { locale, isRTL } = useI18n();
  const AdvanceIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <section className="panel-surface overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400">
            {locale === "en" ? "Live queue" : "قائمة الطلبات الحية"}
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Orders list" : "قائمة الطلبات"}
          </h3>
        </div>
        <span className="inline-flex items-center justify-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
          {orders.length} {locale === "en" ? "orders" : "طلب"}
        </span>
      </div>

      <div className="space-y-3">
        {orders.map((order) => {
          const canAdvance = order.status === "accepted";
          const isBusy = Boolean(busyOrderIds?.[order.id]);
          const isSelected = selectedOrderId === order.id;
          const actionLabel = canAdvance
            ? locale === "en"
              ? "Mark delivered"
              : "تأكيد التسليم"
            : order.status === "pending"
              ? locale === "en"
                ? "Driver accepts first"
                : "قبول الطلب من السائق"
              : locale === "en"
                ? "Closed"
                : "مغلق";

          return (
            <article
              key={`${order.id}-row`}
              onClick={() => onSelectOrder(order.id)}
              className={cn(
                "cursor-pointer rounded-[24px] border p-4 transition sm:p-5",
                isSelected
                  ? "border-brand-300 bg-brand-50/70 shadow-[0_20px_40px_-30px_rgba(14,116,144,0.45)]"
                  : "border-slate-100 bg-white hover:border-brand-200 hover:bg-brand-50/30"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="break-words text-lg font-extrabold text-slate-900">
                    {order.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    <span className="numeric-ltr">#{order.id}</span> • {order.gasType}
                  </p>
                  <p className="numeric-ltr mt-1 text-sm text-slate-500">
                    {order.phone}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.status} />
                  <button
                    type="button"
                    disabled={!canAdvance || isBusy}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAdvanceStatus(order.id);
                    }}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition sm:w-auto",
                      canAdvance
                        ? "bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800"
                        : "cursor-not-allowed bg-slate-100 text-slate-400"
                    )}
                  >
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCheck className="h-4 w-4" />
                    )}
                    {actionLabel}
                    {canAdvance ? <AdvanceIcon className="h-4 w-4" /> : null}
                  </button>
                </div>
              </div>

              {order.status === "pending" ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  {locale === "en"
                    ? "Pending order must be accepted by driver app."
                    : "الطلب المعلّق يتم قبوله من تطبيق السائق."}
                </p>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoChip
                  icon={MapPin}
                  label={locale === "en" ? "Address" : "العنوان"}
                  value={order.addressFull || order.location}
                />
                <InfoChip
                  icon={CreditCard}
                  label={locale === "en" ? "Payment" : "الدفع"}
                  value={getPaymentMethodLabel(order.paymentMethod, locale)}
                />
                <InfoChip
                  icon={Truck}
                  label={locale === "en" ? "Driver" : "السائق"}
                  value={
                    order.driverName ||
                    (locale === "en" ? "Unassigned" : "غير معيّن")
                  }
                />
                <InfoChip
                  icon={Clock3}
                  label={locale === "en" ? "Created at" : "وقت الإنشاء"}
                  value={
                    <span className="numeric-ltr">
                      {formatDateTime(order.createdAt, locale)}
                    </span>
                  }
                />
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <UserRound className="h-3.5 w-3.5" />
                {locale === "en"
                  ? "Click any order to open full details and editing."
                  : "اضغط على أي طلب لفتح التفاصيل الكاملة والتعديل."}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
