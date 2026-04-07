"use client";

import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Loader2,
  LocateFixed,
  MapPinned,
  Navigation,
  Save,
  Search,
  SquareDashedMousePointer
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import LoadingSpinner from "@/components/shared/loading-spinner";
import StatusBadge from "@/components/shared/status-badge";
import { useAdmin } from "@/hooks/use-admin";
import { useI18n } from "@/hooks/use-i18n";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import {
  formatCoordinates,
  getDriverCoordinates,
  getOrderCustomerCoordinates,
  getOrderDriverCoordinates,
  haversineDistanceKm,
  isLocationStale,
  toLatitude,
  toLongitude
} from "@/lib/geo";
import {
  fetchDriverTrailRequest,
  fetchMapAnalyticsRequest,
  fetchMapRouteRequest,
  geocodeSearchRequest,
  reverseGeocodeRequest
} from "@/services/api";

const OperationsLeafletMap = dynamic(
  () => import("@/components/map/operations-leaflet-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }
);

const DRIVER_STALE_MINUTES = 20;

function buildCoordinateForm(order) {
  const coordinates = getOrderCustomerCoordinates(order);

  return {
    addressText: order?.addressText || order?.addressFull || order?.location || "",
    latitude: coordinates ? String(coordinates.latitude) : "",
    longitude: coordinates ? String(coordinates.longitude) : ""
  };
}

function alertTone(severity) {
  if (severity === "high") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (severity === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function MapPage() {
  const {
    orders,
    drivers,
    zones,
    resources,
    refreshAdminData,
    updateOrder,
    saveZone,
    orderMutationIds,
    zoneMutationIds
  } = useAdmin();
  const { locale } = useI18n();
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editorOrderId, setEditorOrderId] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [coordinateForm, setCoordinateForm] = useState({
    addressText: "",
    latitude: "",
    longitude: ""
  });
  const [editablePoint, setEditablePoint] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [trail, setTrail] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [drawingZone, setDrawingZone] = useState(false);
  const [zoneDraftPoints, setZoneDraftPoints] = useState([]);

  const data = useMemo(() => {
    const driversById = new Map(drivers.map((driver) => [Number(driver.id), driver]));
    const driverMarkers = drivers
      .map((driver) => {
        const coordinates = getDriverCoordinates(driver);
        const stale = coordinates
          ? isLocationStale(driver.lastLocationAt, DRIVER_STALE_MINUTES)
          : true;
        return coordinates
          ? {
              key: `driver-${driver.id}`,
              driverId: Number(driver.id),
              label: driver.name,
              status: driver.status || "offline",
              availability: driver.availability || "available",
              lastLocationAt: driver.lastLocationAt || null,
              isConnected: driver.status === "online" && !stale,
              isStale: stale,
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
          lastLocationAt: assignedDriver?.lastLocationAt || null,
          driverCoordinates,
          distanceKm: haversineDistanceKm(driverCoordinates, customerCoordinates)
        };
      })
      .filter(Boolean);

    return {
      driverMarkers,
      orderMarkers,
      activeTrips,
      ordersMissingCoordinates: orders.filter(
        (order) => !getOrderCustomerCoordinates(order)
      )
    };
  }, [drivers, orders]);

  useEffect(() => {
    setSelectedOrderId((current) =>
      data.activeTrips.some((trip) => trip.orderId === current)
        ? current
        : data.activeTrips[0]?.orderId || orders[0]?.id || null
    );
  }, [data.activeTrips, orders]);

  useEffect(() => {
    setEditorOrderId((current) =>
      orders.some((order) => Number(order.id) === Number(current))
        ? current
        : data.ordersMissingCoordinates[0]?.id ||
            data.activeTrips[0]?.orderId ||
            orders[0]?.id ||
            null
    );
  }, [data.activeTrips, data.ordersMissingCoordinates, orders]);

  useEffect(() => {
    setSelectedZoneId((current) =>
      zones.some((zone) => Number(zone.id) === Number(current))
        ? current
        : zones[0]?.id || null
    );
  }, [zones]);

  const focusedTrip =
    data.activeTrips.find((trip) => trip.orderId === selectedOrderId) ||
    data.activeTrips[0] ||
    null;
  const editableOrder =
    orders.find((order) => Number(order.id) === Number(editorOrderId)) || null;
  const selectedZone =
    zones.find((zone) => Number(zone.id) === Number(selectedZoneId)) || null;

  useEffect(() => {
    setCoordinateForm(buildCoordinateForm(editableOrder));
    const coordinates = getOrderCustomerCoordinates(editableOrder);
    setEditablePoint(coordinates ? { ...coordinates } : null);
  }, [editableOrder?.id, editableOrder?.updatedAt]);

  useEffect(() => {
    if (!selectedZone || drawingZone) {
      return;
    }

    setZoneDraftPoints(selectedZone.polygon || []);
  }, [selectedZone, drawingZone]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setAnalyticsLoading(true);
      try {
        const response = await fetchMapAnalyticsRequest();
        if (!cancelled) {
          setAnalytics(response);
        }
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      }
    }

    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [orders.length, drivers.length, zones.length]);

  useEffect(() => {
    let cancelled = false;

    async function loadTripData() {
      if (!focusedTrip) {
        setRouteData(null);
        setTrail([]);
        return;
      }

      setRouteLoading(true);
      try {
        const [routeResponse, trailResponse] = await Promise.all([
          fetchMapRouteRequest({
            fromLat: focusedTrip.driverCoordinates.latitude,
            fromLng: focusedTrip.driverCoordinates.longitude,
            toLat: focusedTrip.customerCoordinates.latitude,
            toLng: focusedTrip.customerCoordinates.longitude
          }),
          fetchDriverTrailRequest({
            driverId: focusedTrip.driverId,
            orderId: focusedTrip.orderId,
            limit: 80
          })
        ]);

        if (!cancelled) {
          setRouteData(routeResponse);
          setTrail(trailResponse);
        }
      } catch {
        if (!cancelled) {
          setRouteData(null);
          setTrail([]);
        }
      } finally {
        if (!cancelled) {
          setRouteLoading(false);
        }
      }
    }

    loadTripData();
    return () => {
      cancelled = true;
    };
  }, [
    focusedTrip?.driverId,
    focusedTrip?.orderId,
    focusedTrip?.driverCoordinates?.latitude,
    focusedTrip?.driverCoordinates?.longitude,
    focusedTrip?.customerCoordinates?.latitude,
    focusedTrip?.customerCoordinates?.longitude
  ]);

  async function reverseLookup(point) {
    setReversing(true);
    try {
      const result = await reverseGeocodeRequest(point.latitude, point.longitude);
      if (result?.address) {
        setCoordinateForm((current) => ({
          ...current,
          addressText: result.address
        }));
      }
    } catch {
      // Allow manual editing when reverse lookup fails.
    } finally {
      setReversing(false);
    }
  }

  function handleMapPick(point) {
    if (drawingZone) {
      setZoneDraftPoints((current) => [...current, point]);
      return;
    }

    setEditablePoint(point);
    setCoordinateForm((current) => ({
      ...current,
      latitude: String(point.latitude),
      longitude: String(point.longitude)
    }));
    reverseLookup(point);
  }

  async function handleSaveCoordinates(event) {
    event.preventDefault();

    if (!editableOrder || !editablePoint) {
      return;
    }

    const latitude = toLatitude(editablePoint.latitude);
    const longitude = toLongitude(editablePoint.longitude);
    const addressText = coordinateForm.addressText.trim();

    if (latitude === null || longitude === null) {
      toast.error(
        locale === "en"
          ? "Choose a valid map point first."
          : "اختر نقطة خريطة صحيحة أولًا."
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
    setAnalytics(await fetchMapAnalyticsRequest().catch(() => analytics));
  }

  async function handleSearchPlaces() {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      setSearchResults(await geocodeSearchRequest(query, 6));
    } catch {
      toast.error(
        locale === "en"
          ? "Unable to search locations right now."
          : "تعذر البحث عن المواقع الآن."
      );
    } finally {
      setSearching(false);
    }
  }

  function applySearchResult(result) {
    const point = {
      latitude: result.latitude,
      longitude: result.longitude
    };

    setEditablePoint(point);
    setCoordinateForm({
      addressText: result.address || result.name || "",
      latitude: String(point.latitude),
      longitude: String(point.longitude)
    });
    setSearchResults([]);
  }

  async function handleSaveZonePolygon() {
    if (!selectedZone || zoneDraftPoints.length < 3) {
      toast.error(
        locale === "en"
          ? "Add at least three points for the zone polygon."
          : "أضف ثلاث نقاط على الأقل لمضلع المنطقة."
      );
      return;
    }

    await saveZone(selectedZone.id, { polygon: zoneDraftPoints });
    setDrawingZone(false);
    setAnalytics(await fetchMapAnalyticsRequest().catch(() => analytics));
  }

  if (
    resources.orders.loading &&
    resources.drivers.loading &&
    resources.zones.loading &&
    orders.length === 0 &&
    drivers.length === 0 &&
    zones.length === 0
  ) {
    return (
      <LoadingSpinner
        label={locale === "en" ? "Loading map operations..." : "جارٍ تحميل عمليات الخريطة..."}
      />
    );
  }

  if (
    resources.orders.error &&
    resources.drivers.error &&
    resources.zones.error &&
    orders.length === 0 &&
    drivers.length === 0 &&
    zones.length === 0
  ) {
    return (
      <ErrorState
        title={locale === "en" ? "Unable to load map operations" : "تعذر تحميل عمليات الخريطة"}
        description={resources.orders.error || resources.drivers.error || resources.zones.error}
        actionLabel={locale === "en" ? "Retry" : "إعادة المحاولة"}
        onAction={() => refreshAdminData()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel-surface-dark p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white">
              <MapPinned className="h-3.5 w-3.5" />
              {locale === "en" ? "Professional map operations" : "تشغيل خرائط احترافي"}
            </span>
            <h1 className="max-w-3xl text-2xl font-extrabold text-white lg:text-3xl">
              {locale === "en"
                ? "Real map, geocoding, coverage polygons, and map alerts"
                : "خريطة حقيقية، وترميز جغرافي، ومضلعات تغطية، وتنبيهات خرائط"}
            </h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: locale === "en" ? "Zones with polygons" : "مناطق لها مضلعات",
                value: analytics?.snapshot?.zonesWithPolygons || 0
              },
              {
                label: locale === "en" ? "Active trips" : "رحلات نشطة",
                value: analytics?.snapshot?.activeTrips || data.activeTrips.length
              },
              {
                label: locale === "en" ? "Stale drivers" : "سائقون بموقع قديم",
                value: analytics?.snapshot?.staleDrivers || 0
              },
              {
                label: locale === "en" ? "Map alerts" : "تنبيهات الخرائط",
                value: analytics?.alerts?.length || 0
              }
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3"
              >
                <p className="text-xs text-slate-300">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {formatNumber(item.value, locale)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        <section className="space-y-4">
          <OperationsLeafletMap
            locale={locale}
            orderMarkers={data.orderMarkers}
            driverMarkers={data.driverMarkers}
            zones={zones}
            focusedTrip={focusedTrip}
            editablePoint={editablePoint}
            onEditablePointChange={(point) => {
              setEditablePoint(point);
              setCoordinateForm((current) => ({
                ...current,
                latitude: String(point.latitude),
                longitude: String(point.longitude)
              }));
            }}
            routePoints={routeData?.points || []}
            driverTrail={trail}
            isDrawingZone={drawingZone}
            zoneDraftPoints={zoneDraftPoints}
            onMapPick={handleMapPick}
          />

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: locale === "en" ? "Missing order coordinates" : "طلبات بلا إحداثيات",
                value: data.ordersMissingCoordinates.length
              },
              {
                label: locale === "en" ? "Outside coverage" : "خارج التغطية",
                value: analytics?.snapshot?.outsideCoverage || 0
              },
              {
                label: locale === "en" ? "Off-route trips" : "رحلات خارج المسار",
                value: analytics?.snapshot?.offRouteTrips || 0
              }
            ].map((item) => (
              <article key={item.label} className="panel-surface p-5">
                <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-slate-950">
                  {formatNumber(item.value, locale)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <section className="panel-surface p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-slate-900">
                {locale === "en" ? "Focused trip" : "الرحلة المحددة"}
              </h2>
              {routeLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
            </div>

            {focusedTrip ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-sm font-bold text-slate-900">
                    #{focusedTrip.orderId} - {focusedTrip.customerName}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{focusedTrip.customerAddress}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={focusedTrip.driverStatus} />
                    <StatusBadge status={focusedTrip.driverAvailability} />
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">
                      {locale === "en" ? "Driver" : "السائق"}:
                    </span>{" "}
                    {focusedTrip.driverName || "--"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">ETA:</span>{" "}
                    {routeData?.etaMinutes
                      ? `${routeData.etaMinutes} ${locale === "en" ? "min" : "دقيقة"}`
                      : locale === "en"
                        ? "Unavailable"
                        : "غير متوفر"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      {locale === "en" ? "Distance" : "المسافة"}:
                    </span>{" "}
                    {routeData?.distanceKm
                      ? `${routeData.distanceKm.toFixed(1)} km`
                      : focusedTrip.distanceKm
                        ? `${focusedTrip.distanceKm.toFixed(1)} km`
                        : locale === "en"
                          ? "Unavailable"
                          : "غير متوفر"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      {locale === "en" ? "Driver coordinates" : "إحداثيات السائق"}:
                    </span>{" "}
                    {formatCoordinates(
                      focusedTrip.driverCoordinates.latitude,
                      focusedTrip.driverCoordinates.longitude
                    )}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      {locale === "en" ? "Customer coordinates" : "إحداثيات العميل"}:
                    </span>{" "}
                    {formatCoordinates(
                      focusedTrip.customerCoordinates.latitude,
                      focusedTrip.customerCoordinates.longitude
                    )}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">
                      {locale === "en" ? "Last ping" : "آخر تحديث"}:
                    </span>{" "}
                    {formatRelativeTime(focusedTrip.lastLocationAt, locale)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${focusedTrip.customerCoordinates.latitude},${focusedTrip.customerCoordinates.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button-secondary w-full sm:w-auto"
                  >
                    <Navigation className="h-4 w-4" />
                    {locale === "en" ? "Open navigation" : "فتح الملاحة"}
                  </a>
                  <button
                    type="button"
                    onClick={() => setEditorOrderId(focusedTrip.orderId)}
                    className="button-primary w-full sm:w-auto"
                  >
                    <LocateFixed className="h-4 w-4" />
                    {locale === "en" ? "Edit this order" : "تعديل هذا الطلب"}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState
                title={locale === "en" ? "No active trip" : "لا توجد رحلة نشطة"}
                description={
                  locale === "en"
                    ? "Accepted orders with valid driver and customer coordinates will appear here."
                    : "ستظهر هنا الطلبات المقبولة التي تملك إحداثيات صحيحة للسائق والعميل."
                }
              />
            )}
          </section>

          <section className="panel-surface p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-slate-900">
                {locale === "en" ? "Map alerts" : "تنبيهات الخرائط"}
              </h2>
              {analyticsLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
            </div>

            <div className="mt-4 space-y-3">
              {analytics?.alerts?.length ? (
                analytics.alerts.slice(0, 8).map((alert) => (
                  <article
                    key={alert.id}
                    className={`rounded-[22px] border p-4 ${alertTone(alert.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{alert.title}</p>
                        <p className="mt-1 text-sm leading-6">{alert.message}</p>
                        <p className="mt-2 text-xs opacity-80">
                          {formatRelativeTime(alert.createdAt, locale)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  title={locale === "en" ? "No active alerts" : "لا توجد تنبيهات نشطة"}
                  description={
                    locale === "en"
                      ? "Coverage issues, missing coordinates, stale drivers, and route deviations will appear here."
                      : "ستظهر هنا مشاكل التغطية ونقص الإحداثيات وقدم مواقع السائقين والانحراف عن المسار."
                  }
                />
              )}
            </div>
          </section>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Order coordinate editor" : "محرر إحداثيات الطلب"}
          </h2>

          {editableOrder ? (
            <form onSubmit={handleSaveCoordinates} className="mt-5 space-y-4">
              <select
                className="select-premium"
                value={editorOrderId || ""}
                onChange={(event) => setEditorOrderId(Number(event.target.value))}
              >
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    #{order.id} - {order.name}
                  </option>
                ))}
              </select>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  className="input-premium"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={
                    locale === "en"
                      ? "Search address or landmark..."
                      : "ابحث عن عنوان أو معلم..."
                  }
                />
                <button
                  type="button"
                  onClick={handleSearchPlaces}
                  disabled={searching}
                  className="button-secondary h-12"
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {locale === "en" ? "Search" : "بحث"}
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-3">
                  <div className="grid gap-2">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.latitude}-${result.longitude}-${index}`}
                        type="button"
                        onClick={() => applySearchResult(result)}
                        className="rounded-2xl bg-white px-4 py-3 text-start text-sm transition hover:bg-brand-50"
                      >
                        <p className="font-semibold text-slate-900">
                          {result.name || result.address}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {result.address}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <textarea
                className="min-h-[110px] w-full rounded-[24px] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                value={coordinateForm.addressText}
                onChange={(event) =>
                  setCoordinateForm((current) => ({
                    ...current,
                    addressText: event.target.value
                  }))
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  step="0.000001"
                  className="input-premium numeric-ltr"
                  value={coordinateForm.latitude}
                  onChange={(event) => {
                    const nextLatitude = event.target.value;
                    setCoordinateForm((current) => ({
                      ...current,
                      latitude: nextLatitude
                    }));
                    const latitude = toLatitude(nextLatitude);
                    const longitude = toLongitude(coordinateForm.longitude);
                    if (latitude !== null && longitude !== null) {
                      setEditablePoint({ latitude, longitude });
                    }
                  }}
                />
                <input
                  type="number"
                  step="0.000001"
                  className="input-premium numeric-ltr"
                  value={coordinateForm.longitude}
                  onChange={(event) => {
                    const nextLongitude = event.target.value;
                    setCoordinateForm((current) => ({
                      ...current,
                      longitude: nextLongitude
                    }));
                    const latitude = toLatitude(coordinateForm.latitude);
                    const longitude = toLongitude(nextLongitude);
                    if (latitude !== null && longitude !== null) {
                      setEditablePoint({ latitude, longitude });
                    }
                  }}
                />
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 text-xs leading-6 text-slate-600">
                {reversing
                  ? locale === "en"
                    ? "Refreshing address from the selected point..."
                    : "جارٍ تحديث العنوان من النقطة المحددة..."
                  : locale === "en"
                    ? "Click the map or drag the pin to refine the delivery location."
                    : "انقر على الخريطة أو اسحب المؤشر لتحسين موقع التوصيل."}
              </div>

              <button
                type="submit"
                disabled={Boolean(orderMutationIds[editableOrder.id])}
                className="button-primary w-full sm:w-auto"
              >
                {Boolean(orderMutationIds[editableOrder.id]) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {locale === "en" ? "Save order coordinates" : "حفظ إحداثيات الطلب"}
              </button>
            </form>
          ) : (
            <EmptyState
              title={locale === "en" ? "No order available" : "لا يوجد طلب متاح"}
              description={
                locale === "en"
                  ? "When orders appear, coordinate editing will be available here."
                  : "عند ظهور الطلبات سيصبح تحرير الإحداثيات متاحًا هنا."
              }
            />
          )}
        </section>

        <section className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Zone polygon editor" : "محرر مضلعات المناطق"}
          </h2>

          {selectedZone ? (
            <div className="mt-5 space-y-4">
              <select
                className="select-premium"
                value={selectedZoneId || ""}
                onChange={(event) => {
                  setSelectedZoneId(Number(event.target.value));
                  setDrawingZone(false);
                }}
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {locale === "en" ? zone.nameEn : zone.nameAr}
                  </option>
                ))}
              </select>

              <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">
                    {locale === "en" ? "Saved shape" : "المضلع المحفوظ"}:
                  </span>{" "}
                  {selectedZone.polygon?.length >= 3
                    ? locale === "en"
                      ? `${selectedZone.polygon.length} points`
                      : `${selectedZone.polygon.length} نقاط`
                    : locale === "en"
                      ? "No polygon yet"
                      : "لا يوجد مضلع بعد"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    {locale === "en" ? "Draft points" : "نقاط المسودة"}:
                  </span>{" "}
                  {zoneDraftPoints.length}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDrawingZone(true);
                    setZoneDraftPoints([]);
                  }}
                  className="button-secondary w-full sm:w-auto"
                >
                  <SquareDashedMousePointer className="h-4 w-4" />
                  {locale === "en" ? "Start drawing" : "بدء الرسم"}
                </button>
                <button
                  type="button"
                  onClick={() => setZoneDraftPoints((current) => current.slice(0, -1))}
                  disabled={zoneDraftPoints.length === 0}
                  className="button-secondary w-full sm:w-auto"
                >
                  {locale === "en" ? "Undo point" : "تراجع"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawingZone(false);
                    setZoneDraftPoints(selectedZone.polygon || []);
                  }}
                  className="button-secondary w-full sm:w-auto"
                >
                  {locale === "en" ? "Restore saved polygon" : "استعادة المضلع"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveZonePolygon}
                disabled={Boolean(zoneMutationIds[selectedZone.id])}
                className="button-primary w-full sm:w-auto"
              >
                {Boolean(zoneMutationIds[selectedZone.id]) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {locale === "en" ? "Save zone polygon" : "حفظ مضلع المنطقة"}
              </button>
            </div>
          ) : (
            <EmptyState
              title={locale === "en" ? "No zone available" : "لا توجد منطقة متاحة"}
              description={
                locale === "en"
                  ? "Draw and save coverage polygons as soon as zones are available."
                  : "ارسم واحفظ مضلعات التغطية بمجرد توفر المناطق."
              }
            />
          )}
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="panel-surface p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            {locale === "en" ? "Orders missing coordinates" : "طلبات بلا إحداثيات"}
          </h2>
          <div className="mt-4 space-y-3">
            {data.ordersMissingCoordinates.length === 0 ? (
              <EmptyState
                title={locale === "en" ? "No blocked orders" : "لا توجد طلبات متعطلة"}
                description={
                  locale === "en"
                    ? "Every current order already has customer coordinates."
                    : "كل الطلبات الحالية لديها إحداثيات عميل."
                }
              />
            ) : (
              data.ordersMissingCoordinates.map((order) => (
                <article
                  key={order.id}
                  className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        #{order.id} - {order.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {order.addressFull || order.location}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditorOrderId(order.id)}
                      className="button-secondary"
                    >
                      <LocateFixed className="h-4 w-4" />
                      {locale === "en" ? "Fix now" : "إصلاح الآن"}
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
          <div className="mt-4 space-y-3">
            {drivers.map((driver) => {
              const coordinates = getDriverCoordinates(driver);
              const stale = coordinates
                ? isLocationStale(driver.lastLocationAt, DRIVER_STALE_MINUTES)
                : true;

              return (
                <article
                  key={driver.id}
                  className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{driver.name}</p>
                        <StatusBadge status={driver.status} />
                        <StatusBadge status={driver.availability} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {coordinates
                          ? formatCoordinates(coordinates.latitude, coordinates.longitude)
                          : locale === "en"
                            ? "No valid coordinates"
                            : "لا توجد إحداثيات صحيحة"}
                      </p>
                    </div>
                    <div className="text-xs sm:text-end">
                      <p
                        className={
                          !coordinates || stale
                            ? "font-semibold text-amber-700"
                            : "font-semibold text-emerald-700"
                        }
                      >
                        {!coordinates
                          ? locale === "en"
                            ? "Missing location"
                            : "موقع مفقود"
                          : stale
                            ? locale === "en"
                              ? "Stale location"
                              : "موقع قديم"
                            : locale === "en"
                              ? "Healthy"
                              : "سليم"}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {formatRelativeTime(driver.lastLocationAt, locale)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
