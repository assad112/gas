const axios = require("axios");

const ROUTING_BASE_URL =
  process.env.ROUTING_BASE_URL?.trim() ||
  "https://router.project-osrm.org/route/v1/driving";
const ROUTING_REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.ROUTING_REQUEST_TIMEOUT_MS || "3500",
  10
);
const ROUTING_CACHE_TTL_MS = Number.parseInt(
  process.env.ROUTING_CACHE_TTL_MS || "12000",
  10
);
const ROUTING_MAX_POINTS = Number.parseInt(
  process.env.ROUTING_MAX_POINTS || "72",
  10
);
const FALLBACK_SPEED_METERS_PER_SECOND = Number.parseFloat(
  process.env.ROUTING_FALLBACK_SPEED_MPS || "8.5"
);

const routeCache = new Map();

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeLatLngPoint(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const latitude = toFiniteNumber(
    value.latitude ?? value.lat ?? value[1]
  );
  const longitude = toFiniteNumber(
    value.longitude ?? value.lng ?? value.lon ?? value.long ?? value[0]
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

function normalizeRoutePoints(points = []) {
  return points
    .map((point) => normalizeLatLngPoint(point))
    .filter(Boolean);
}

function trimRoutePoints(points, maxPoints = ROUTING_MAX_POINTS) {
  if (!Array.isArray(points) || points.length <= maxPoints) {
    return points;
  }

  const trimmed = [];
  const step = (points.length - 1) / (maxPoints - 1);

  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round(index * step);
    trimmed.push(points[sourceIndex]);
  }

  return trimmed;
}

function haversineDistanceMeters(origin, destination) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(destination.latitude - origin.latitude);
  const deltaLongitude = toRadians(destination.longitude - origin.longitude);
  const originLatitudeRadians = toRadians(origin.latitude);
  const destinationLatitudeRadians = toRadians(destination.latitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(originLatitudeRadians) *
      Math.cos(destinationLatitudeRadians) *
      Math.sin(deltaLongitude / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function buildCacheKey(origin, destination) {
  const round = (value) => Number(value).toFixed(5);
  return [
    round(origin.latitude),
    round(origin.longitude),
    round(destination.latitude),
    round(destination.longitude)
  ].join("|");
}

function buildTrackingPayload({
  points,
  distanceMeters,
  durationSeconds,
  provider,
  isFallback = false
}) {
  const normalizedPoints = trimRoutePoints(normalizeRoutePoints(points));
  const safeDistanceMeters = Math.max(
    0,
    Math.round(toFiniteNumber(distanceMeters) || 0)
  );
  const safeDurationSeconds = Math.max(
    0,
    Math.round(toFiniteNumber(durationSeconds) || 0)
  );
  const etaMinutes = Math.max(1, Math.ceil(safeDurationSeconds / 60));

  const route = {
    points: normalizedPoints.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      lat: point.latitude,
      lng: point.longitude
    })),
    distanceMeters: safeDistanceMeters,
    durationSeconds: safeDurationSeconds,
    etaMinutes,
    provider,
    isFallback,
    computedAt: new Date().toISOString()
  };

  return {
    routePoints: route.points,
    route_points: route.points,
    routeDistanceMeters: route.distanceMeters,
    route_distance_meters: route.distanceMeters,
    routeDurationSeconds: route.durationSeconds,
    route_duration_seconds: route.durationSeconds,
    etaMinutes: route.etaMinutes,
    eta_minutes: route.etaMinutes,
    trackingRoute: route,
    tracking_route: route
  };
}

function toPublicRouteResponse(trackingPayload) {
  const trackingRoute =
    trackingPayload?.trackingRoute ?? trackingPayload?.tracking_route ?? {};
  const normalizedPoints = normalizeRoutePoints(
    trackingPayload?.routePoints ??
      trackingPayload?.route_points ??
      trackingRoute.points
  );
  const distanceMeters = Math.max(
    0,
    Math.round(
      toFiniteNumber(
        trackingPayload?.routeDistanceMeters ??
          trackingPayload?.route_distance_meters ??
          trackingRoute.distanceMeters
      ) || 0
    )
  );
  const durationSeconds = Math.max(
    0,
    Math.round(
      toFiniteNumber(
        trackingPayload?.routeDurationSeconds ??
          trackingPayload?.route_duration_seconds ??
          trackingRoute.durationSeconds
      ) || 0
    )
  );
  const etaMinutes = Math.max(
    1,
    Math.ceil(
      toFiniteNumber(
        trackingPayload?.etaMinutes ??
          trackingPayload?.eta_minutes ??
          trackingRoute.etaMinutes
      ) ||
        durationSeconds / 60 ||
        1
    )
  );
  const computedAt = trackingRoute.computedAt || new Date().toISOString();

  return {
    provider: trackingRoute.provider || null,
    isFallback: Boolean(trackingRoute.isFallback),
    computedAt,
    distance: distanceMeters,
    distanceMeters,
    distanceKm: Number((distanceMeters / 1000).toFixed(2)),
    duration: durationSeconds,
    durationSeconds,
    etaMinutes,
    geometry: {
      type: "LineString",
      coordinates: normalizedPoints.map((point) => [
        point.longitude,
        point.latitude
      ])
    },
    points: normalizedPoints.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      lat: point.latitude,
      lng: point.longitude
    }))
  };
}

function buildFallbackTracking(origin, destination) {
  const distanceMeters = haversineDistanceMeters(origin, destination);
  const durationSeconds = Math.max(
    60,
    Math.round(distanceMeters / FALLBACK_SPEED_METERS_PER_SECOND)
  );

  return buildTrackingPayload({
    points: [origin, destination],
    distanceMeters,
    durationSeconds,
    provider: "fallback",
    isFallback: true
  });
}

async function fetchRouteFromOsrm(origin, destination) {
  const requestUrl = `${ROUTING_BASE_URL}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const response = await axios.get(requestUrl, {
    timeout: ROUTING_REQUEST_TIMEOUT_MS,
    params: {
      alternatives: false,
      steps: false,
      overview: "full",
      geometries: "geojson"
    }
  });

  const route = response.data?.routes?.[0];
  const coordinates = route?.geometry?.coordinates;

  if (!route || !Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error("Routing provider did not return a valid route.");
  }

  return buildTrackingPayload({
    points: coordinates.map((coordinate) => ({
      latitude: coordinate[1],
      longitude: coordinate[0]
    })),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    provider: "osrm"
  });
}

async function resolveTrackingPayload(originInput, destinationInput) {
  const origin = normalizeLatLngPoint(originInput);
  const destination = normalizeLatLngPoint(destinationInput);

  if (!origin || !destination) {
    throw new Error("Both origin and destination coordinates are required.");
  }

  const cacheKey = buildCacheKey(origin, destination);
  const now = Date.now();
  const cached = routeCache.get(cacheKey);

  if (cached && now - cached.createdAt <= ROUTING_CACHE_TTL_MS) {
    return cached.payload;
  }

  let trackingPayload;

  try {
    trackingPayload = await fetchRouteFromOsrm(origin, destination);
  } catch (_) {
    trackingPayload = buildFallbackTracking(origin, destination);
  }

  routeCache.set(cacheKey, {
    createdAt: now,
    payload: trackingPayload
  });

  return trackingPayload;
}

async function getRouteBetweenCoordinates(originInput, destinationInput) {
  const trackingPayload = await resolveTrackingPayload(
    originInput,
    destinationInput
  );

  return toPublicRouteResponse(trackingPayload);
}

function shouldBuildTrackingForOrder(order) {
  if (!order) {
    return false;
  }

  const status = String(order.status || "").toLowerCase();
  const driverStage = String(
    order.driverStage || order.driver_stage || ""
  ).toLowerCase();

  if (status !== "accepted") {
    return false;
  }

  return ["accepted", "on_the_way", "arrived"].includes(driverStage);
}

function resolveOrderTrackingEndpoints(order) {
  const origin = normalizeLatLngPoint({
    latitude: order.driverLatitude ?? order.driver_latitude,
    longitude: order.driverLongitude ?? order.driver_longitude
  });
  const destination = normalizeLatLngPoint({
    latitude:
      order.customerLatitude ??
      order.customer_latitude ??
      order.latitude,
    longitude:
      order.customerLongitude ??
      order.customer_longitude ??
      order.longitude
  });

  if (!origin || !destination) {
    return null;
  }

  return { origin, destination };
}

async function enrichOrderTracking(order) {
  if (!shouldBuildTrackingForOrder(order)) {
    return order;
  }

  const endpoints = resolveOrderTrackingEndpoints(order);
  if (!endpoints) {
    return order;
  }

  const { origin, destination } = endpoints;
  const trackingPayload = await resolveTrackingPayload(origin, destination);

  return {
    ...order,
    ...trackingPayload
  };
}

async function enrichOrdersTracking(orders = []) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return orders;
  }

  return Promise.all(orders.map((order) => enrichOrderTracking(order)));
}

module.exports = {
  enrichOrderTracking,
  enrichOrdersTracking,
  getRouteBetweenCoordinates,
  normalizeLatLngPoint,
  toPublicRouteResponse
};
