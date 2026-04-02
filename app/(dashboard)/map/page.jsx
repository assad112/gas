"use client";

import {
  ExternalLink,
  Loader2,
  MapPinned,
  Navigation,
  Route,
  Save,
  TriangleAlert,
  Truck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import StatusBadge from "@/components/shared/status-badge";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";
import {
  formatDateTime,
  formatNumber,
  formatRelativeTime
} from "@/lib/format";
import {
  formatCoordinates,
  getDriverCoordinates,
  getOrderCustomerCoordinates,
  getOrderDriverCoordinates,
  haversineDistanceKm,
  isLocationStale,
  projectGeoPoints,
  toLatitude,
  toLongitude
} from "@/lib/geo";
import { cn } from "@/lib/utils";

const DRIVER_STALE_MINUTES = 20;
const boardStyle = {
  backgroundImage:
    "linear-gradient(rgba(148,163,184,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.12) 1px, transparent 1px), radial-gradient(circle at 18% 20%, rgba(255,156,60,.18), transparent 24%), radial-gradient(circle at 82% 24%, rgba(23,173,143,.18), transparent 24%), linear-gradient(180deg, rgba(2,6,23,.98) 0%, rgba(15,23,42,.96) 100%)",
  backgroundSize: "38px 38px, 38px 38px, auto, auto, auto"
};

function mapsSearchUrl(latitude, longitude) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function mapsDirectionsUrl(origin, destination) {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
}

function formatDistance(distanceKm, locale) {
  if (distanceKm === null || distanceKm === undefined) {
    return locale === "en" ? "Unavailable" : "غير متوفر";
  }

  return `${new Intl.NumberFormat(locale === "en" ? "en-OM" : "ar-OM", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(distanceKm)} km`;
}

function buildCoordinateForm(order) {
  const coordinates = getOrderCustomerCoordinates(order);

  return {
    addressText: order?.addressText || order?.addressFull || order?.location || "",
    latitude:
      coordinates?.latitude !== undefined && coordinates?.latitude !== null
        ? String(coordinates.latitude)
        : "",
    longitude:
      coordinates?.longitude !== undefined && coordinates?.longitude !== null
        ? String(coordinates.longitude)
        : ""
  };
}

export default function MapPage() {
  const {
    orders,
    drivers,
    resources,
    refreshAdminData,
    updateOrder,
    orderMutationIds
  } = useAdmin();
  const { locale, isRTL } = useI18n();
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editorOrderId, setEditorOrderId] = useState(null);
  const [coordinateForm, setCoordinateForm] = useState({
    addressText: "",
    latitude: "",
    longitude: ""
  });

  const data = useMemo(() => {
    const driversById = new Map(drivers.map((driver) => [Number(driver.id), driver]));

    const driverMarkers = drivers
      .map((driver) => {
        const coordinates = getDriverCoordinates(driver);

        return coordinates
          ? {
              key: `driver-${driver.id}`,
              type: "driver",
              driverId: Number(driver.id),
              label: driver.name,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude
            }
          : null;
      })
      .filter(Boolean);

    const orderMarkers = orders
      .map((order) => {
        const coordinates = getOrderCustomerCoordinates(order);

        return coordinates
          ? {
              key: `order-${order.id}`,
              type: "order",
              orderId: Number(order.id),
              label: `#${order.id}`,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude
            }
          : null;
      })
      .filter(Boolean);

    const activeTrips = orders
      .map((order) => {
        if (order.status !== "accepted" || !order.assignedDriverId) {
          return null;
        }

        const customerCoordinates = getOrderCustomerCoordinates(order);
        const assignedDriver = driversById.get(Number(order.assignedDriverId));
        const driverCoordinates =
          getOrderDriverCoordinates(order) || getDriverCoordinates(assignedDriver);

        if (!customerCoordinates || !driverCoordinates) {
          return null;
        }

        return {
          orderId: Number(order.id),
          customerName: order.name,
          customerAddress: order.addressFull || order.location,
          customerCoordinates,
          driverId: Number(order.assignedDriverId),
          driverName: order.driverName || assignedDriver?.name || "",
          driverStatus: assignedDriver?.status || order.driverStatus || "offline",
          driverAvailability:
            assignedDriver?.availability || order.driverAvailability || "available",
          driverLocation: assignedDriver?.currentLocation || order.driverLocation || "",
          driverCoordinates,
          lastLocationAt: assignedDriver?.lastLocationAt || null,
          updatedAt: order.updatedAt || order.createdAt || null,
          distanceKm: haversineDistanceKm(driverCoordinates, customerCoordinates)
        };
      })
      .filter(Boolean);

    const driverHealth = drivers.map((driver) => {
      const coordinates = getDriverCoordinates(driver);

      return {
        ...driver,
        coordinates,
        stale: coordinates
          ? isLocationStale(driver.lastLocationAt, DRIVER_STALE_MINUTES)
          : true
      };
    });

    const ordersMissingCoordinates = orders.filter(
      (order) => !getOrderCustomerCoordinates(order)
    );

    return {
      projected: projectGeoPoints([...driverMarkers, ...orderMarkers]),
      driverMarkers,
      orderMarkers,
      activeTrips,
      ordersMissingCoordinates,
      driverHealth,
      driversMissingCoordinates: driverHealth.filter((driver) => !driver.coordinates),
      staleDrivers: driverHealth.filter((driver) => driver.coordinates && driver.stale)
    };
  }, [drivers, orders]);

  useEffect(() => {
    setSelectedOrderId((currentOrderId) => {
      if (data.activeTrips.some((trip) => trip.orderId === currentOrderId)) {
        return currentOrderId;
      }

      return data.activeTrips[0]?.orderId ?? null;
    });
  }, [data.activeTrips]);

  useEffect(() => {
    setEditorOrderId((currentOrderId) => {
      if (orders.some((order) => Number(order.id) === Number(currentOrderId))) {
        return currentOrderId;
      }

      return (
        data.ordersMissingCoordinates[0]?.id ||
        data.activeTrips[0]?.orderId ||
        orders[0]?.id ||
        null
      );
    });
  }, [data.activeTrips, data.ordersMissingCoordinates, orders]);

  const focusedTrip =
    data.activeTrips.find((trip) => trip.orderId === selectedOrderId) ||
    data.activeTrips[0] ||
    null;

  const editableOrder =
    orders.find((order) => Number(order.id) === Number(editorOrderId)) || null;
  const editorBusy = editableOrder ? Boolean(orderMutationIds[editableOrder.id]) : false;

  useEffect(() => {
    setCoordinateForm(buildCoordinateForm(editableOrder));
  }, [editableOrder?.id, editableOrder?.updatedAt]);

  async function handleCoordinateSave(event) {
    event.preventDefault();

    if (!editableOrder) {
      return;
    }

    const latitude = toLatitude(coordinateForm.latitude.trim());
    const longitude = toLongitude(coordinateForm.longitude.trim());
    const addressText = coordinateForm.addressText.trim();

    if (latitude === null || longitude === null) {
      toast.error(
        locale === "en"
          ? "Enter a valid latitude and longitude first."
          : "أدخل خط عرض وخط طول صحيحين أولًا."
      );
      return;
    }

    if (!addressText) {
      toast.error(
        locale === "en"
          ? "Address text is required before saving."
          : "وصف العنوان مطلوب قبل الحفظ."
      );
      return;
    }

    await updateOrder(editableOrder.id, {
      addressText,
      addressFull: addressText,
      customerLatitude: latitude,
      customerLongitude: longitude
    });

    setSelectedOrderId(editableOrder.id);
  }

  if (
    resources.orders.loading &&
    resources.drivers.loading &&
    orders.length === 0 &&
    drivers.length === 0
  ) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading map data..." : "جاري تحميل بيانات الخريطة..."}
      />
    );
  }

  if (
    resources.orders.error &&
    resources.drivers.error &&
    orders.length === 0 &&
    drivers.length === 0
  ) {
    return (
      <ErrorState
        title={locale === "en" ? "Unable to load map data" : "تعذر تحميل بيانات الخريطة"}
        description={resources.orders.error || resources.drivers.error}
        actionLabel={locale === "en" ? "Retry" : "إعادة المحاولة"}
        onAction={() => refreshAdminData()}
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
              ? "right-0 bg-gradient-to-l from-ocean-400/20 to-transparent"
              : "left-0 bg-gradient-to-r from-ocean-400/20 to-transparent"
          )}
        />
        <div
          className={cn(
            "absolute top-6 h-32 w-32 rounded-full bg-brand-300/20 blur-3xl",
            isRTL ? "-left-10" : "-right-10"
          )}
        />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
              <MapPinned className="h-3.5 w-3.5" />
              {locale === "en" ? "Live map operations" : "تشغيل الخريطة الحي"}
            </span>
            <h1 className="max-w-3xl text-2xl font-extrabold leading-tight text-white lg:text-3xl">
              {locale === "en"
                ? "Map, coordinates, and trip readiness"
                : "الخريطة والإحداثيات وجاهزية الرحلات"}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
              {locale === "en"
                ? "This page shows what is already trackable, what still needs valid coordinates, and which driver locations have gone stale."
                : "هذه الصفحة تعرض ما يمكن تتبعه الآن، وما الذي ما زال ينقصه موقع صحيح، وأي مواقع سائقين أصبحت قديمة وتحتاج تحديثًا."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">
                {locale === "en" ? "Mapped orders" : "طلبات لها إحداثيات"}
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {formatNumber(data.orderMarkers.length, locale)}
              </p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">
                {locale === "en" ? "Live trips" : "رحلات نشطة مكتملة"}
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {formatNumber(data.activeTrips.length, locale)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="panel-surface p-5">
          <p className="text-sm font-semibold text-slate-500">
            {locale === "en" ? "Drivers with live location" : "السائقون بموقع حي"}
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">
            {formatNumber(data.driverMarkers.length, locale)}
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            {locale === "en"
              ? "Visible immediately on the board."
              : "ظاهرون مباشرة داخل اللوحة."}
          </p>
        </article>

        <article className="panel-surface p-5">
          <p className="text-sm font-semibold text-slate-500">
            {locale === "en" ? "Trackable trips" : "رحلات قابلة للتتبع"}
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">
            {formatNumber(data.activeTrips.length, locale)}
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            {locale === "en"
              ? "Accepted orders with driver and customer coordinates."
              : "طلبات مقبولة تتوفر لها إحداثيات السائق والعميل."}
          </p>
        </article>

        <article className="panel-surface p-5">
          <p className="text-sm font-semibold text-slate-500">
            {locale === "en" ? "Orders missing coordinates" : "طلبات ينقصها موقع دقيق"}
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">
            {formatNumber(data.ordersMissingCoordinates.length, locale)}
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            {locale === "en"
              ? "Need customer latitude and longitude."
              : "تحتاج إحداثيات العميل حتى تظهر على الخريطة."}
          </p>
        </article>

        <article className="panel-surface p-5">
          <p className="text-sm font-semibold text-slate-500">
            {locale === "en" ? "Driver location issues" : "مشاكل مواقع السائقين"}
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">
            {formatNumber(
              data.driversMissingCoordinates.length + data.staleDrivers.length,
              locale
            )}
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            {locale === "en"
              ? "Missing pings plus stale locations."
              : "مواقع مفقودة أو قديمة تحتاج متابعة."}
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <section className="panel-surface-dark p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {locale === "en" ? "Customer point" : "نقطة العميل"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {locale === "en" ? "Driver point" : "نقطة السائق"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {locale === "en" ? "Active trip line" : "خط رحلة نشطة"}
            </span>
          </div>

          {Object.keys(data.projected).length === 0 ? (
            <EmptyState
              title={locale === "en" ? "No map points yet" : "لا توجد نقاط خريطة بعد"}
              description={
                locale === "en"
                  ? "Valid coordinates will appear here as soon as they are stored."
                  : "ستظهر هنا الإحداثيات الصحيحة بمجرد تخزينها في النظام."
              }
            />
          ) : (
            <div
              className="relative min-h-[420px] overflow-hidden rounded-[28px] border border-white/10"
              style={boardStyle}
            >
              <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                {data.activeTrips.map((trip) => {
                  const driverPoint = data.projected[`driver-${trip.driverId}`];
                  const orderPoint = data.projected[`order-${trip.orderId}`];

                  if (!driverPoint || !orderPoint) {
                    return null;
                  }

                  return (
                    <line
                      key={trip.orderId}
                      x1={`${driverPoint.x}%`}
                      y1={`${driverPoint.y}%`}
                      x2={`${orderPoint.x}%`}
                      y2={`${orderPoint.y}%`}
                      stroke={
                        focusedTrip?.orderId === trip.orderId
                          ? "#10b981"
                          : "rgba(148,163,184,.42)"
                      }
                      strokeDasharray={
                        focusedTrip?.orderId === trip.orderId ? "0" : "6 6"
                      }
                      strokeWidth={focusedTrip?.orderId === trip.orderId ? 4 : 2}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {Object.values(data.projected).map((point) => {
                const selected =
                  (point.type === "order" &&
                    point.orderId === focusedTrip?.orderId) ||
                  (point.type === "driver" &&
                    point.driverId === focusedTrip?.driverId);

                return (
                  <button
                    key={point.key}
                    type="button"
                    onClick={() => {
                      if (point.type === "order") {
                        setSelectedOrderId(point.orderId);
                        setEditorOrderId(point.orderId);
                      }
                    }}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  >
                    <span className="relative flex items-center justify-center">
                      <span
                        className={cn(
                          "absolute h-7 w-7 rounded-full border",
                          selected
                            ? "border-white/80 bg-white/10"
                            : "border-transparent"
                        )}
                      />
                      <span
                        className={cn(
                          point.type === "order"
                            ? "block h-4 w-4 rounded-full border-2 border-white bg-brand-400"
                            : "block h-4 w-4 rotate-45 rounded-[5px] border-2 border-white bg-ocean-400"
                        )}
                      />
                    </span>
                    <span className="mt-2 hidden whitespace-nowrap rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-white md:block">
                      {point.label}
                    </span>
                  </button>
                );
              })}

              <div className="absolute bottom-4 start-4 max-w-xs rounded-[22px] border border-white/10 bg-slate-950/65 px-4 py-3 text-xs leading-6 text-slate-200">
                {locale === "en"
                  ? "Relative board based on stored coordinates. Road routing can be added later."
                  : "لوحة نسبية مبنية على الإحداثيات المخزنة حاليًا. يمكن إضافة مسارات الطرق لاحقًا."}
              </div>
            </div>
          )}
        </section>

        <section className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Focused trip" : "الرحلة المحددة"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {locale === "en"
              ? "Pick any active order to inspect the live path between driver and customer."
              : "اختر أي طلب نشط لمراجعة المسار الحي بين السائق والعميل."}
          </p>

          {focusedTrip ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      #{focusedTrip.orderId} - {focusedTrip.customerName}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {focusedTrip.customerAddress}
                    </p>
                  </div>
                  <StatusBadge status="accepted" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-xs font-semibold text-slate-500">
                      {locale === "en" ? "Assigned driver" : "السائق المعيّن"}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {focusedTrip.driverName ||
                        (locale === "en" ? "Unavailable" : "غير متوفر")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={focusedTrip.driverStatus} />
                      <StatusBadge status={focusedTrip.driverAvailability} />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-xs font-semibold text-slate-500">
                      {locale === "en" ? "Distance estimate" : "تقدير المسافة"}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDistance(focusedTrip.distanceKm, locale)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {locale === "en" ? "Last location ping" : "آخر تحديث موقع"}:{" "}
                      {formatRelativeTime(focusedTrip.lastLocationAt, locale)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-600">
                      {locale === "en" ? "Customer coordinates" : "إحداثيات العميل"}
                    </p>
                    <p className="numeric-ltr mt-1">
                      {formatCoordinates(
                        focusedTrip.customerCoordinates.latitude,
                        focusedTrip.customerCoordinates.longitude
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">
                      {locale === "en" ? "Driver coordinates" : "إحداثيات السائق"}
                    </p>
                    <p className="numeric-ltr mt-1">
                      {formatCoordinates(
                        focusedTrip.driverCoordinates.latitude,
                        focusedTrip.driverCoordinates.longitude
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={mapsSearchUrl(
                      focusedTrip.customerCoordinates.latitude,
                      focusedTrip.customerCoordinates.longitude
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="button-primary w-full sm:w-auto"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {locale === "en" ? "Open customer pin" : "فتح موقع العميل"}
                  </a>
                  <a
                    href={mapsDirectionsUrl(
                      focusedTrip.driverCoordinates,
                      focusedTrip.customerCoordinates
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="button-secondary w-full sm:w-auto"
                  >
                    <Navigation className="h-4 w-4" />
                    {locale === "en" ? "Open navigation" : "فتح الملاحة"}
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                {data.activeTrips.map((trip) => (
                  <button
                    key={trip.orderId}
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(trip.orderId);
                      setEditorOrderId(trip.orderId);
                    }}
                    className={cn(
                      "w-full rounded-[24px] border px-4 py-4 text-start transition",
                      trip.orderId === focusedTrip.orderId
                        ? "border-brand-300 bg-brand-50 shadow-sm"
                        : "border-slate-100 bg-slate-50/70 hover:border-slate-200 hover:bg-white"
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          #{trip.orderId} - {trip.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {trip.driverName ||
                            (locale === "en" ? "No driver name" : "لا يوجد اسم سائق")}
                        </p>
                      </div>
                      <div className="text-xs text-slate-500 sm:text-end">
                        <p>{formatDistance(trip.distanceKm, locale)}</p>
                        <p className="mt-1">
                          {formatRelativeTime(trip.updatedAt, locale)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title={
                locale === "en"
                  ? "No fully trackable trip yet"
                  : "لا توجد رحلة مكتملة التتبع بعد"
              }
              description={
                locale === "en"
                  ? "A trip appears here when the accepted order has both customer coordinates and a live driver location."
                  : "ستظهر الرحلة هنا عندما يتوفر للطلب المقبول موقع العميل مع موقع حي للسائق."
              }
            />
          )}
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Orders missing coordinates" : "طلبات ينقصها موقع دقيق"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {locale === "en"
              ? "These orders still have address text, but no valid customer latitude and longitude."
              : "هذه الطلبات تملك عنوانًا نصيًا، لكنها ما زالت بلا إحداثيات عميل صحيحة."}
          </p>
          <div className="mt-4 space-y-3">
            {data.ordersMissingCoordinates.length === 0 ? (
              <EmptyState
                title={
                  locale === "en"
                    ? "All current orders are mapped"
                    : "كل الطلبات الحالية مُمثلة"
                }
                description={
                  locale === "en"
                    ? "No current order is blocked by missing coordinates."
                    : "لا يوجد طلب حاليًا متعطل بسبب نقص الإحداثيات."
                }
              />
            ) : (
              data.ordersMissingCoordinates.map((order) => (
                <article
                  key={order.id}
                  className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        #{order.id} - {order.name}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {order.addressFull || order.location}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 sm:text-end">
                      <p>{formatDateTime(order.createdAt, locale)}</p>
                      <p className="mt-1">{order.phone}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setEditorOrderId(order.id);
                        setSelectedOrderId(order.id);
                      }}
                      className="button-secondary w-full sm:w-auto"
                    >
                      {locale === "en" ? "Edit coordinates" : "تعديل الإحداثيات"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
        <section className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Driver location health" : "صحة مواقع السائقين"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {locale === "en"
              ? `Locations older than ${DRIVER_STALE_MINUTES} minutes are marked stale.`
              : `أي موقع أقدم من ${DRIVER_STALE_MINUTES} دقيقة يُعتبر قديمًا.`}
          </p>
          <div className="mt-4 space-y-3">
            {data.driverHealth.map((driver) => (
              <article
                key={driver.id}
                className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {driver.name}
                      </p>
                      <StatusBadge status={driver.status} />
                      <StatusBadge status={driver.availability} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {driver.currentLocation ||
                        (locale === "en"
                          ? "No textual location"
                          : "لا يوجد وصف موقع")}
                    </p>
                    <p className="numeric-ltr mt-1 text-xs text-slate-500">
                      {driver.coordinates
                        ? formatCoordinates(
                            driver.coordinates.latitude,
                            driver.coordinates.longitude
                          )
                        : locale === "en"
                          ? "No valid coordinates"
                          : "لا توجد إحداثيات صحيحة"}
                    </p>
                  </div>
                  <div className="text-xs sm:text-end">
                    <p
                      className={cn(
                        "font-semibold",
                        !driver.coordinates || driver.stale
                          ? "text-amber-700"
                          : "text-emerald-700"
                      )}
                    >
                      {!driver.coordinates
                        ? locale === "en"
                          ? "Needs first location ping"
                          : "بحاجة لأول تحديث موقع"
                        : driver.stale
                          ? locale === "en"
                            ? "Location is stale"
                            : "الموقع قديم"
                          : locale === "en"
                            ? "Location is healthy"
                            : "الموقع محدث"}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {locale === "en" ? "Last update" : "آخر تحديث"}:{" "}
                      {formatRelativeTime(driver.lastLocationAt, locale)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en"
              ? "Admin coordinate editing"
              : "تحرير الإحداثيات من الأدمن"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            {locale === "en"
              ? "Choose any order, correct its address and coordinates, then save directly from the map operations screen."
              : "اختر أي طلب، وصحح العنوان والإحداثيات، ثم احفظ مباشرة من شاشة تشغيل الخريطة."}
          </p>

          {editableOrder ? (
            <form onSubmit={handleCoordinateSave} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {locale === "en" ? "Target order" : "الطلب المستهدف"}
                </label>
                <select
                  className="select-premium"
                  value={editorOrderId || ""}
                  onChange={(event) => setEditorOrderId(Number(event.target.value))}
                >
                  {orders.map((order) => {
                    const hasCoordinates = Boolean(getOrderCustomerCoordinates(order));

                    return (
                      <option key={order.id} value={order.id}>
                        #{order.id} - {order.name} -{" "}
                        {hasCoordinates
                          ? locale === "en"
                            ? "mapped"
                            : "له إحداثيات"
                          : locale === "en"
                            ? "needs coordinates"
                            : "ينقصه موقع"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-sm font-bold text-slate-900">
                  #{editableOrder.id} - {editableOrder.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {editableOrder.addressFull || editableOrder.location}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {locale === "en" ? "Address text" : "وصف العنوان"}
                </label>
                <textarea
                  className="min-h-[110px] w-full rounded-[24px] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                  value={coordinateForm.addressText}
                  onChange={(event) =>
                    setCoordinateForm((current) => ({
                      ...current,
                      addressText: event.target.value
                    }))
                  }
                  placeholder={
                    locale === "en"
                      ? "Building, street, landmark, and any useful delivery notes..."
                      : "اسم المبنى والشارع والعلامة الفارقة وأي تفاصيل مساعدة..."
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {locale === "en" ? "Latitude" : "خط العرض"}
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    className="input-premium numeric-ltr"
                    value={coordinateForm.latitude}
                    onChange={(event) =>
                      setCoordinateForm((current) => ({
                        ...current,
                        latitude: event.target.value
                      }))
                    }
                    placeholder="23.588000"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {locale === "en" ? "Longitude" : "خط الطول"}
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    className="input-premium numeric-ltr"
                    value={coordinateForm.longitude}
                    onChange={(event) =>
                      setCoordinateForm((current) => ({
                        ...current,
                        longitude: event.target.value
                      }))
                    }
                    placeholder="58.382900"
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 text-xs leading-6 text-slate-600">
                {locale === "en"
                  ? "Saving here updates the order location in the operational backend so it becomes visible on the map and ready for driver tracking."
                  : "الحفظ هنا يحدث موقع الطلب داخل الباكند التشغيلي، بحيث يصبح ظاهرًا على الخريطة وجاهزًا للتتبع من السائق."}
              </div>

              <button
                type="submit"
                disabled={editorBusy}
                className="button-primary w-full sm:w-auto"
              >
                {editorBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {locale === "en" ? "Save coordinates" : "حفظ الإحداثيات"}
              </button>
            </form>
          ) : (
            <EmptyState
              title={locale === "en" ? "No order available" : "لا يوجد طلب متاح"}
              description={
                locale === "en"
                  ? "Once orders appear, you will be able to correct their coordinates here."
                  : "عند وصول الطلبات ستتمكن من تصحيح إحداثياتها من هنا."
              }
            />
          )}
        </section>

        <section className="panel-surface p-5 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-lg font-extrabold text-slate-900">
                {locale === "en"
                  ? "What this solves now"
                  : "ما الذي يعالجه هذا القسم الآن"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {locale === "en"
                  ? "The map section now gives operations a live visual layer, confirms which trips are truly trackable, and lets admin correct missing coordinates without leaving the dashboard."
                  : "قسم الخريطة أصبح الآن يمنح التشغيل طبقة بصرية حيّة، ويؤكد أي الرحلات قابلة للتتبع فعلاً، ويتيح للأدمن تصحيح الإحداثيات الناقصة دون مغادرة اللوحة."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3">
                <Truck className="h-4 w-4" />
                {locale === "en" ? "Drivers visible" : "السائقون ظاهرون"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3">
                <Route className="h-4 w-4" />
                {locale === "en" ? "Trips ready" : "الرحلات جاهزة"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3">
                <TriangleAlert className="h-4 w-4" />
                {locale === "en" ? "Issues exposed" : "المشاكل مكشوفة"}
              </span>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
