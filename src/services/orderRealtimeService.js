const { enrichOrderTracking } = require("./trackingRouteService");

const ADMIN_ROOM = "admin_dashboard";
const DRIVERS_ROOM = "drivers_live";

function toPositiveInteger(value) {
  const parsedValue = Number.parseInt(String(value), 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function collectDriverIds(order) {
  return [
    toPositiveInteger(order?.assigned_driver_id ?? order?.assignedDriverId),
    toPositiveInteger(
      order?.current_candidate_driver_id ?? order?.currentCandidateDriverId
    )
  ].filter(Boolean);
}

function emitOrderEvents(
  io,
  order,
  eventName = "order_updated",
  { previousOrder = null, extraDriverIds = [] } = {}
) {
  if (!io || !order) {
    return;
  }

  const customerIds = new Set(
    [
      order.customer_id ?? order.customerId,
      previousOrder?.customer_id ?? previousOrder?.customerId
    ]
      .map((item) => toPositiveInteger(item))
      .filter(Boolean)
  );
  const driverIds = new Set([
    ...collectDriverIds(order),
    ...collectDriverIds(previousOrder),
    ...extraDriverIds
      .map((item) => toPositiveInteger(item))
      .filter(Boolean)
  ]);
  const targetRooms = [
    ADMIN_ROOM,
    ...[...customerIds].map((customerId) => `customer:${customerId}`),
    ...[...driverIds].map((driverId) => `driver:${driverId}`)
  ];

  for (const roomName of new Set(targetRooms.filter(Boolean))) {
    io.to(roomName).emit(eventName, order);

    if (eventName !== "order_updated") {
      io.to(roomName).emit("order_updated", order);
    }

    io.to(roomName).emit("order_status_changed", order);
  }
}

async function emitOrderTrackingUpdate(io, order) {
  if (!io || !order) {
    return;
  }

  const trackingOrder = await enrichOrderTracking(order);
  const customerId = toPositiveInteger(
    trackingOrder.customer_id ?? trackingOrder.customerId
  );
  const assignedDriverId = toPositiveInteger(
    trackingOrder.assigned_driver_id ?? trackingOrder.assignedDriverId
  );
  const targetRooms = [
    customerId ? `customer:${customerId}` : null,
    assignedDriverId ? `driver:${assignedDriverId}` : null
  ].filter(Boolean);

  for (const roomName of new Set(targetRooms)) {
    io.to(roomName).emit("order_tracking_updated", trackingOrder);
  }
}

function emitOrdersReset(io, { deletedCount = 0, affectedCustomerIds = [] } = {}) {
  if (!io) {
    return;
  }

  const targetRooms = [
    ADMIN_ROOM,
    DRIVERS_ROOM,
    ...affectedCustomerIds
      .map((customerId) => toPositiveInteger(customerId))
      .filter(Boolean)
      .map((customerId) => `customer:${customerId}`)
  ];

  for (const roomName of new Set(targetRooms.filter(Boolean))) {
    io.to(roomName).emit("orders_reset", {
      deletedCount,
      resetAt: new Date().toISOString()
    });
  }
}

function emitDriverNotification(io, driverId, payload) {
  const resolvedDriverId = toPositiveInteger(driverId);

  if (!io || !resolvedDriverId || !payload) {
    return;
  }

  io.to(`driver:${resolvedDriverId}`).emit("driver_notification", payload);
}

module.exports = {
  ADMIN_ROOM,
  DRIVERS_ROOM,
  emitOrderEvents,
  emitOrderTrackingUpdate,
  emitOrdersReset,
  emitDriverNotification
};
