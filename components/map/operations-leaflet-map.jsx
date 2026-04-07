"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";

function FitView({ points, polygons }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([]);

    points.forEach((point) => {
      bounds.extend([point.latitude, point.longitude]);
    });

    polygons.forEach((polygon) => {
      polygon.forEach((point) => {
        bounds.extend([point.latitude, point.longitude]);
      });
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.18), { animate: true });
    }
  }, [map, points, polygons]);

  return null;
}

function MapClickBridge({ onClick }) {
  useMapEvents({
    click(event) {
      onClick?.({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6))
      });
    }
  });

  return null;
}

export default function OperationsLeafletMap({
  locale,
  orderMarkers,
  driverMarkers,
  zones,
  focusedTrip,
  editablePoint,
  onEditablePointChange,
  routePoints,
  driverTrail,
  isDrawingZone,
  zoneDraftPoints,
  onMapPick
}) {
  const editPinIcon = useMemo(
    () =>
      L.divIcon({
        className: "map-edit-pin",
        html: '<div class="map-edit-pin__inner"></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      }),
    []
  );

  const focusPoints = useMemo(() => {
    const points = [];

    if (focusedTrip?.customerCoordinates) {
      points.push(focusedTrip.customerCoordinates);
    }

    if (focusedTrip?.driverCoordinates) {
      points.push(focusedTrip.driverCoordinates);
    }

    if (editablePoint) {
      points.push(editablePoint);
    }

    orderMarkers.forEach((marker) => {
      points.push({
        latitude: marker.latitude,
        longitude: marker.longitude
      });
    });
    driverMarkers.forEach((marker) => {
      points.push({
        latitude: marker.latitude,
        longitude: marker.longitude
      });
    });

    return points;
  }, [driverMarkers, editablePoint, focusedTrip, orderMarkers]);

  const polygonPoints = useMemo(
    () => [
      ...zones
        .map((zone) => zone.polygon || [])
        .filter((polygon) => Array.isArray(polygon) && polygon.length > 2),
      ...(zoneDraftPoints.length > 2 ? [zoneDraftPoints] : [])
    ],
    [zoneDraftPoints, zones]
  );

  function getDriverMarkerStyle(marker) {
    if (focusedTrip?.driverId === marker.driverId) {
      return {
        radius: 9,
        fillColor: "#f97316"
      };
    }

    if (marker.isConnected) {
      return {
        radius: 10,
        fillColor: "#16a34a"
      };
    }

    if (marker.isStale) {
      return {
        radius: 7,
        fillColor: "#94a3b8"
      };
    }

    return {
      radius: 7,
      fillColor: "#0ea5e9"
    };
  }

  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100">
      <style jsx global>{`
        .map-edit-pin {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-edit-pin__inner {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #ffffff;
          border: 4px solid #0f766e;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.24);
        }
      `}</style>

      <MapContainer
        center={[23.588, 58.3829]}
        zoom={10}
        scrollWheelZoom
        className="h-[560px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickBridge onClick={onMapPick} />
        <FitView points={focusPoints} polygons={polygonPoints} />

        {zones.map((zone) =>
          Array.isArray(zone.polygon) && zone.polygon.length > 2 ? (
            <Polygon
              key={`zone-${zone.id}`}
              positions={zone.polygon.map((point) => [
                point.latitude,
                point.longitude
              ])}
              pathOptions={{
                color: zone.isActive ? "#0f766e" : "#64748b",
                fillColor: zone.isActive ? "#14b8a6" : "#94a3b8",
                fillOpacity: 0.16,
                weight: 2
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">
                    {locale === "en" ? zone.nameEn : zone.nameAr}
                  </p>
                  <p>{zone.governorate}</p>
                </div>
              </Popup>
            </Polygon>
          ) : null
        )}

        {zoneDraftPoints.length > 0 ? (
          <>
            {zoneDraftPoints.length > 2 ? (
              <Polygon
                positions={zoneDraftPoints.map((point) => [
                  point.latitude,
                  point.longitude
                ])}
                pathOptions={{
                  color: "#f97316",
                  fillColor: "#fb923c",
                  fillOpacity: 0.12,
                  dashArray: "6 6",
                  weight: 2
                }}
              />
            ) : (
              <Polyline
                positions={zoneDraftPoints.map((point) => [
                  point.latitude,
                  point.longitude
                ])}
                pathOptions={{
                  color: "#f97316",
                  dashArray: "6 6",
                  weight: 3
                }}
              />
            )}
          </>
        ) : null}

        {routePoints.length > 1 ? (
          <Polyline
            positions={routePoints.map((point) => [
              point.latitude,
              point.longitude
            ])}
            pathOptions={{
              color: "#2563eb",
              weight: 4
            }}
          />
        ) : null}

        {driverTrail.length > 1 ? (
          <Polyline
            positions={driverTrail.map((point) => [point.latitude, point.longitude])}
            pathOptions={{
              color: "#f97316",
              dashArray: "4 8",
              weight: 3
            }}
          />
        ) : null}

        {orderMarkers.map((marker) => (
          <CircleMarker
            key={marker.key}
            center={[marker.latitude, marker.longitude]}
            radius={focusedTrip?.orderId === marker.orderId ? 9 : 7}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor:
                focusedTrip?.orderId === marker.orderId ? "#2563eb" : "#0f766e",
              fillOpacity: 1
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.92}>
              {marker.label}
            </Tooltip>
          </CircleMarker>
        ))}

        {driverMarkers.map((marker) => (
          <CircleMarker
            key={marker.key}
            center={[marker.latitude, marker.longitude]}
            radius={getDriverMarkerStyle(marker).radius}
            pathOptions={{
              color: "#ffffff",
              weight: marker.isConnected ? 3 : 2,
              fillColor: getDriverMarkerStyle(marker).fillColor,
              fillOpacity: 1
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.92}>
              {marker.isConnected
                ? `${marker.label} • ${locale === "en" ? "Connected" : "متصل"}`
                : marker.label}
            </Tooltip>

            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{marker.label}</p>
                <p>
                  {locale === "en" ? "Status" : "الحالة"}:{" "}
                  {marker.isConnected
                    ? locale === "en"
                      ? "Connected"
                      : "متصل"
                    : marker.status}
                </p>
                <p>
                  {locale === "en" ? "Availability" : "التوفر"}:{" "}
                  {marker.availability}
                </p>
                <p>
                  {locale === "en" ? "Coordinates" : "الإحداثيات"}:{" "}
                  {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {editablePoint ? (
          <Marker
            draggable
            icon={editPinIcon}
            position={[editablePoint.latitude, editablePoint.longitude]}
            eventHandlers={{
              dragend(event) {
                const nextPoint = event.target.getLatLng();
                onEditablePointChange?.({
                  latitude: Number(nextPoint.lat.toFixed(6)),
                  longitude: Number(nextPoint.lng.toFixed(6))
                });
              }
            }}
          >
            <Popup>
              {isDrawingZone
                ? locale === "en"
                  ? "Map click adds zone polygon points."
                  : "النقر على الخريطة يضيف نقاط مضلع المنطقة."
                : locale === "en"
                  ? "Drag to refine the delivery coordinate."
                  : "اسحب لتعديل إحداثية التوصيل بدقة."}
            </Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}
