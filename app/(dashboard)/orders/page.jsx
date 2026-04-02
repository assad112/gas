"use client";

import { Bell, CheckCircle2, Clock3, Loader2, Trash2, XCircle } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import OrderDetailsPanel from "@/components/orders/order-details-panel";
import OrdersTable from "@/components/orders/orders-table";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import SearchFilterBar from "@/components/shared/search-filter-bar";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

function matchesSearch(order, searchTerm) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    order.id,
    order.name,
    order.phone,
    order.location,
    order.addressFull,
    order.gasType,
    order.status,
    order.paymentMethod,
    order.driverName,
    order.notes
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function StatTile({ icon: Icon, label, value, tone }) {
  const tones = {
    pending: "from-amber-100 to-amber-50 text-amber-900",
    accepted: "from-sky-100 to-sky-50 text-sky-900",
    delivered: "from-emerald-100 to-emerald-50 text-emerald-900",
    cancelled: "from-rose-100 to-rose-50 text-rose-900"
  };

  return (
    <article className="panel-surface relative overflow-hidden p-5">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-20 bg-gradient-to-b opacity-70",
          tones[tone] || tones.pending
        )}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </article>
  );
}

export default function OrdersPage() {
  const {
    orders,
    drivers,
    settings,
    resources,
    stats,
    refreshOrders,
    advanceOrderStatus,
    updateOrder,
    cancelOrder,
    resetOrders,
    resettingOrders,
    orderMutationIds
  } = useAdmin();
  const { locale, isRTL } = useI18n();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredOrders = useMemo(() => {
    return [...orders]
      .filter((order) => matchesSearch(order, deferredSearchTerm))
      .filter((order) => (statusFilter === "all" ? true : order.status === statusFilter))
      .sort((firstOrder, secondOrder) => {
        const firstDate = new Date(firstOrder.createdAt).getTime();
        const secondDate = new Date(secondOrder.createdAt).getTime();

        return sortOrder === "desc"
          ? secondDate - firstDate
          : firstDate - secondDate;
      });
  }, [deferredSearchTerm, orders, sortOrder, statusFilter]);

  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) ||
    orders.find((order) => order.id === selectedOrderId) ||
    null;

  useEffect(() => {
    if (!filteredOrders.length) {
      if (selectedOrderId !== null) {
        setSelectedOrderId(null);
      }
      return;
    }

    const stillVisible = filteredOrders.some((order) => order.id === selectedOrderId);

    if (!stillVisible) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  async function handleResetOrders() {
    const confirmed = window.confirm(
      locale === "en"
        ? "Clear all orders from the dashboard? This action removes every order record."
        : "هل تريد تصفير جميع الطلبات من لوحة التحكم؟ سيتم حذف كل سجلات الطلبات."
    );

    if (!confirmed) {
      return;
    }

    await resetOrders();
  }

  if (resources.orders.loading && orders.length === 0) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading orders..." : "جاري تحميل الطلبات..."}
      />
    );
  }

  if (resources.orders.error && orders.length === 0) {
    return (
      <ErrorState
        title={locale === "en" ? "Unable to load orders" : "تعذر تحميل الطلبات"}
        description={resources.orders.error}
        actionLabel={locale === "en" ? "Retry" : "إعادة المحاولة"}
        onAction={() => refreshOrders()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface-dark relative overflow-hidden p-6 lg:p-8">
        <div
          className={cn(
            "absolute inset-y-0 w-48",
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

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
              <Clock3 className="h-3.5 w-3.5" />
              {locale === "en" ? "Live Orders Center" : "مركز الطلبات المباشر"}
            </span>
            <h1 className="max-w-3xl text-2xl font-extrabold leading-tight text-white lg:text-3xl">
              {locale === "en"
                ? "Operational Orders Command"
                : "غرفة قيادة الطلبات التشغيلية"}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
              {locale === "en"
                ? "Track every order in real time, assign drivers, and control status progression with full operational visibility."
                : "تابع كل طلب لحظيًا، وعيّن السائقين، وتحكم في تقدم الحالة مع رؤية تشغيلية كاملة."}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-xs text-slate-300">
                  {locale === "en" ? "Total visible" : "إجمالي المعروض"}
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {filteredOrders.length}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-xs text-slate-300">
                  {locale === "en" ? "Total orders" : "إجمالي الطلبات"}
                </p>
                <p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetOrders}
              disabled={resettingOrders || orders.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] border border-rose-300/35 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
            >
              {resettingOrders ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {locale === "en" ? "Clear all orders" : "تصفير الطلبات"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Bell}
          label={locale === "en" ? "Pending" : "معلقة"}
          value={stats.pending}
          tone="pending"
        />
        <StatTile
          icon={Clock3}
          label={locale === "en" ? "Accepted" : "مقبولة"}
          value={stats.accepted}
          tone="accepted"
        />
        <StatTile
          icon={CheckCircle2}
          label={locale === "en" ? "Delivered" : "مكتملة"}
          value={stats.delivered}
          tone="delivered"
        />
        <StatTile
          icon={XCircle}
          label={locale === "en" ? "Cancelled" : "ملغاة"}
          value={stats.cancelled}
          tone="cancelled"
        />
      </section>

      <SearchFilterBar
        query={searchTerm}
        onQueryChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onRefresh={() => refreshOrders({ silent: true })}
        isRefreshing={resources.orders.refreshing}
      />

      {filteredOrders.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No matching orders" : "لا توجد طلبات مطابقة"}
          description={
            locale === "en"
              ? "Adjust your search or status filter, or wait for a new order to arrive through Socket.IO."
              : "جرّب تعديل البحث أو فلتر الحالة، أو انتظر وصول طلب جديد عبر Socket.IO."
          }
        />
      ) : (
        <section className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.2fr)_390px]">
          <OrdersTable
            orders={filteredOrders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            onAdvanceStatus={advanceOrderStatus}
            busyOrderIds={orderMutationIds}
          />
          <div className="2xl:sticky 2xl:top-6">
            <OrderDetailsPanel
              order={selectedOrder}
              drivers={drivers}
              settings={settings}
              busy={selectedOrder ? Boolean(orderMutationIds[selectedOrder.id]) : false}
              onSave={updateOrder}
              onCancel={cancelOrder}
            />
          </div>
        </section>
      )}
    </div>
  );
}

