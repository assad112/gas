const driverModel = require("../models/driverModel");
const orderModel = require("../models/orderModel");
const zoneModel = require("../models/zoneModel");
const mapModel = require("../models/mapModel");
const {
  pointInPolygon,
  normalizePoint,
  distanceMetersToPolyline
} = require("../utils/geometry");
const {
  enrichOrderTracking
} = require("./trackingRouteService");

const STALE_DRIVER_MINUTES = Number.parseInt(
  process.env.MAP_STALE_DRIVER_MINUTES || "20",
  10
);
const OFF_ROUTE_DISTANCE_METERS = Number.parseInt(
  process.env.MAP_OFF_ROUTE_DISTANCE_METERS || "300",
  10
);

function isLocationStale(value, maxMinutes = STALE_DRIVER_MINUTES) {
  if (!value) {
    return true;
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > maxMinutes * 60 * 1000;
}

function resolveOrderCoordinates(order) {
  return normalizePoint({
    latitude: order.customerLatitude ?? order.customer_latitude ?? order.latitude,
    longitude:
      order.customerLongitude ?? order.customer_longitude ?? order.longitude
  });
}

function resolveDriverCoordinates(driver, order = null) {
  return normalizePoint({
    latitude: order?.driverLatitude ?? driver?.currentLatitude,
    longitude: order?.driverLongitude ?? driver?.currentLongitude
  });
}

function findContainingZone(point, zones = []) {
  if (!point) {
    return null;
  }

  return (
    zones.find(
      (zone) => zone.isActive !== false && Array.isArray(zone.polygon) && pointInPolygon(point, zone.polygon)
    ) || null
  );
}

function buildAlert({
  alertType,
  severity = "medium",
  entityType,
  entityId,
  title,
  message,
  metadata = null,
  createdAt = new Date().toISOString()
}) {
  return {
    id: `${alertType}:${entityType}:${entityId}`,
    alertType,
    severity,
    entityType,
    entityId: String(entityId),
    title,
    message,
    metadata,
    createdAt
  };
}

async function evaluateRouteDeviation(order, driver) {
  const driverCoordinates = resolveDriverCoordinates(driver, order);
  const customerCoordinates = resolveOrderCoordinates(order);

  if (!driverCoordinates || !customerCoordinates) {
    return null;
  }

  const enrichedOrder = await enrichOrderTracking(order);
  const routePoints =
    enrichedOrder?.routePoints ??
    enrichedOrder?.trackingRoute?.points ??
    [];
  const routeDistanceMeters = distanceMetersToPolyline(
    driverCoordinates,
    routePoints
  );

  if (
    routeDistanceMeters === null ||
    routeDistanceMeters <= OFF_ROUTE_DISTANCE_METERS
  ) {
    await mapModel.resolveMapAlert({
      entityType: "order",
      entityId: order.id,
      alertType: "driver_off_route"
    });
    return null;
  }

  const alert = buildAlert({
    alertType: "driver_off_route",
    severity: "high",
    entityType: "order",
    entityId: order.id,
    title: "Driver appears off route.",
    message: `Driver deviated approximately ${Math.round(
      routeDistanceMeters
    )} meters from the planned route.`,
    metadata: {
      orderId: order.id,
      driverId: driver?.id || order.assigned_driver_id,
      routeDistanceMeters
    }
  });

  await mapModel.upsertMapAlert({
    entityType: "order",
    entityId: order.id,
    alertType: "driver_off_route",
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    metadata: alert.metadata
  });

  return {
    alert,
    routeDistanceMeters,
    order: enrichedOrder
  };
}

async function createLocationHistoryEntry(payload) {
  return mapModel.logDriverLocationHistory(payload);
}

async function getDriverTrail({ driverId = null, orderId = null, limit = 120 } = {}) {
  return mapModel.getDriverLocationTrail({
    driverId,
    orderId,
    limit
  });
}

async function getMapAnalytics() {
  const [orders, drivers, zones, persistedAlerts] = await Promise.all([
    orderModel.getAllOrders(),
    driverModel.getAllDrivers(),
    zoneModel.getAllZones(),
    mapModel.getRecentMapAlerts()
  ]);

  const activeZones = zones.filter((zone) => zone.is_active !== false && zone.isActive !== false);
  const derivedAlerts = [];
  const coverageRows = [];
  let activeTrips = 0;
  let outsideCoverage = 0;
  let staleDrivers = 0;
  let missingDriverLocations = 0;
  let offRouteTrips = 0;

  const driverIndex = new Map(
    drivers.map((driver) => [Number(driver.id), driverModel.toDriverProfile(driver)])
  );

  for (const driverRow of drivers) {
    const driver = driverModel.toDriverProfile(driverRow);

    if (!resolveDriverCoordinates(driver)) {
      missingDriverLocations += 1;
      derivedAlerts.push(
        buildAlert({
          alertType: "driver_missing_location",
          severity: "medium",
          entityType: "driver",
          entityId: driver.id,
          title: "Driver has no live coordinates.",
          message: `${driver.name} has not shared a valid map location yet.`
        })
      );
      continue;
    }

    if (isLocationStale(driver.lastLocationAt)) {
      staleDrivers += 1;
      derivedAlerts.push(
        buildAlert({
          alertType: "driver_location_stale",
          severity: "medium",
          entityType: "driver",
          entityId: driver.id,
          title: "Driver location is stale.",
          message: `${driver.name} has not updated location in the expected time window.`,
          metadata: {
            lastLocationAt: driver.lastLocationAt
          }
        })
      );
    }
  }

  for (const order of orders) {
    const orderCoordinates = resolveOrderCoordinates(order);

    if (!orderCoordinates) {
      derivedAlerts.push(
        buildAlert({
          alertType: "order_missing_coordinates",
          severity: "high",
          entityType: "order",
          entityId: order.id,
          title: "Order missing coordinates.",
          message: `Order #${order.id} still needs customer coordinates before map tracking can work.`
        })
      );
      continue;
    }

    const containingZone = findContainingZone(orderCoordinates, activeZones);

    coverageRows.push({
      orderId: order.id,
      zoneId: containingZone?.id || null,
      zoneName: containingZone?.name_en || containingZone?.nameEn || null,
      insideCoverage: Boolean(containingZone)
    });

    if (!containingZone) {
      outsideCoverage += 1;
      derivedAlerts.push(
        buildAlert({
          alertType: "order_outside_coverage",
          severity: "high",
          entityType: "order",
          entityId: order.id,
          title: "Order sits outside mapped coverage.",
          message: `Order #${order.id} is outside the configured delivery polygons.`,
          metadata: orderCoordinates
        })
      );
    }

    if (order.status === "accepted" && order.assigned_driver_id) {
      activeTrips += 1;
      const driver = driverIndex.get(Number(order.assigned_driver_id));

      if (driver) {
        const deviation = await evaluateRouteDeviation(order, driver);
        if (deviation) {
          offRouteTrips += 1;
          derivedAlerts.push(deviation.alert);
        }
      }
    }
  }

  const alerts = [
    ...derivedAlerts,
    ...persistedAlerts.map((alert) => ({
      id: alert.id,
      alertType: alert.alert_type,
      severity: alert.severity,
      entityType: alert.entity_type,
      entityId: alert.entity_id,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata,
      status: alert.status,
      createdAt: alert.created_at,
      updatedAt: alert.updated_at
    }))
  ]
    .sort((firstAlert, secondAlert) => {
      const firstTime = new Date(
        firstAlert.updatedAt || firstAlert.createdAt || 0
      ).getTime();
      const secondTime = new Date(
        secondAlert.updatedAt || secondAlert.createdAt || 0
      ).getTime();
      return secondTime - firstTime;
    })
    .slice(0, 40);

  return {
    snapshot: {
      totalOrders: orders.length,
      totalDrivers: drivers.length,
      activeTrips,
      staleDrivers,
      missingDriverLocations,
      outsideCoverage,
      offRouteTrips,
      zonesWithPolygons: activeZones.filter((zone) => Array.isArray(zone.polygon)).length
    },
    coverage: coverageRows,
    alerts
  };
}

module.exports = {
  createLocationHistoryEntry,
  evaluateRouteDeviation,
  getDriverTrail,
  getMapAnalytics,
  isLocationStale,
  findContainingZone
};
