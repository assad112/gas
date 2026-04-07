const driverModel = require("../models/driverModel");
const orderModel = require("../models/orderModel");
const {
  acceptDispatchedOrder,
  redispatchOrder,
  resumePendingDispatches
} = require("../services/driverDispatchService");
const {
  emitOrderEvents,
  emitOrderTrackingUpdate,
  emitDriverNotification
} = require("../services/orderRealtimeService");
const { syncRelatedDrivers } = require("./orderController");
const {
  enrichOrderTracking,
  enrichOrdersTracking
} = require("../services/trackingRouteService");
const {
  createLocationHistoryEntry,
  evaluateRouteDeviation
} = require("../services/mapOperationsService");
const { validateCoordinatePair } = require("../utils/coordinates");

const ADMIN_ROOM = "admin_dashboard";
const DRIVERS_ROOM = "drivers_live";

const ALLOWED_DRIVER_STATUS = new Set(["online", "offline"]);
const ALLOWED_DRIVER_AVAILABILITY = new Set(["available", "busy"]);
const ALLOWED_DRIVER_STAGES = new Set([
  "accepted",
  "on_the_way",
  "arrived",
  "delivered",
  "cancelled"
]);

const DRIVER_STAGE_TRANSITIONS = {
  accepted: new Set(["on_the_way", "cancelled", "delivered"]),
  on_the_way: new Set(["arrived", "cancelled", "delivered"]),
  arrived: new Set(["delivered", "cancelled"]),
  delivered: new Set([]),
  cancelled: new Set([])
};

function isValidString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toNullableString(value) {
  return isValidString(value) ? value.trim() : null;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function toNullableOrderId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }

    const normalized = trimmed.toUpperCase().startsWith("ORD-")
      ? trimmed.slice(4)
      : trimmed;
    const parsedValue = Number.parseInt(normalized, 10);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }

  const parsedValue = Number.parseInt(String(value), 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function shouldIncludeTracking(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value !== "string") {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function normalizeDriverStage(order) {
  if (order?.driver_stage) {
    return order.driver_stage;
  }

  if (order?.status === "pending") {
    return "new_order";
  }

  if (order?.status === "accepted") {
    return "accepted";
  }

  if (order?.status === "delivered") {
    return "delivered";
  }

  if (order?.status === "cancelled") {
    return "cancelled";
  }

  return "new_order";
}

function shouldAttemptPendingRedispatch(driver) {
  return driver?.status === "online" && driver?.availability === "available";
}

function schedulePendingRedispatch(io) {
  resumePendingDispatches(io).catch((error) => {
    console.error(`Pending dispatch resume failed: ${error.message}`);
  });
}

function emitDriverUpdated(io, driver, eventName = "driver_updated") {
  if (!io || !driver) {
    return;
  }

  const driverRoom = driver.id ? `driver:${driver.id}` : null;
  const targetRooms = [ADMIN_ROOM, DRIVERS_ROOM, driverRoom].filter(Boolean);

  for (const roomName of targetRooms) {
    io.to(roomName).emit(eventName, driver);

    if (eventName !== "driver_updated") {
      io.to(roomName).emit("driver_updated", driver);
    }
  }
}

async function resolveTrackedOrderForLocationUpdate(driverId, requestedOrderId) {
  const resolvedOrderId =
    toNullableOrderId(requestedOrderId) ||
    toNullableOrderId(
      (
        await driverModel.getDriverWithActiveOrderById(driverId)
      )?.current_order_id
    );

  if (!resolvedOrderId) {
    return null;
  }

  const order = await orderModel.getOrderById(resolvedOrderId);

  if (!order || Number(order.assigned_driver_id) !== Number(driverId)) {
    return null;
  }

  const driverStage = normalizeDriverStage(order);

  if (
    order.status !== "accepted" ||
    !new Set(["accepted", "on_the_way", "arrived"]).has(driverStage)
  ) {
    return null;
  }

  return order;
}

async function getDriverDashboard(req, res, next) {
  try {
    const driverId = Number(req.driver.id);
    const includeTracking = shouldIncludeTracking(req.query.includeTracking);
    const [driver, summary, availableOrders, activeOrders, earnings] =
      await Promise.all([
        driverModel.getDriverById(driverId),
        driverModel.getDriverDashboardSummary(driverId),
        orderModel.getDriverAvailableOrders(driverId),
        orderModel.getDriverActiveOrders(driverId),
        orderModel.getDriverEarningsSummary(driverId)
      ]);
    const dashboardActiveOrders = includeTracking
      ? await enrichOrdersTracking(activeOrders)
      : activeOrders;

    return res.status(200).json({
      driver: driverModel.toDriverProfile(driver),
      summary,
      availableOrders,
      activeOrders: dashboardActiveOrders,
      earnings
    });
  } catch (error) {
    return next(error);
  }
}

async function getDriverProfile(req, res, next) {
  try {
    const driver = await driverModel.getDriverById(Number(req.driver.id));

    return res.status(200).json({
      driver: driverModel.toDriverProfile(driver)
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAvailability(req, res, next) {
  try {
    const status = toNullableString(req.body.status)?.toLowerCase();
    const availability = toNullableString(req.body.availability)?.toLowerCase();

    if (status && !ALLOWED_DRIVER_STATUS.has(status)) {
      return res.status(400).json({
        message: "Invalid driver status."
      });
    }

    if (availability && !ALLOWED_DRIVER_AVAILABILITY.has(availability)) {
      return res.status(400).json({
        message: "Invalid driver availability."
      });
    }

    const updatedDriver = await driverModel.updateDriverOperationalState(
      Number(req.driver.id),
      {
        ...(status ? { status } : {}),
        ...(availability ? { availability } : {})
      }
    );

    emitDriverUpdated(req.app.get("io"), updatedDriver);

    if (shouldAttemptPendingRedispatch(updatedDriver)) {
      schedulePendingRedispatch(req.app.get("io"));
    }

    return res.status(200).json({
      driver: driverModel.toDriverProfile(
        await driverModel.getDriverById(Number(req.driver.id))
      )
    });
  } catch (error) {
    return next(error);
  }
}

async function updateLocation(req, res, next) {
  try {
    const driverId = Number(req.driver.id);
    const latitude = toNullableNumber(
      req.body.latitude ?? req.body.currentLatitude ?? req.body.current_latitude
    );
    const longitude = toNullableNumber(
      req.body.longitude ?? req.body.currentLongitude ?? req.body.current_longitude
    );
    const currentLocation = toNullableString(
      req.body.currentLocation ?? req.body.current_location
    );
    const accuracy = toNullableNumber(
      req.body.accuracy ?? req.body.accuracyMeters ?? req.body.accuracy_meters
    );
    const speed = toNullableNumber(req.body.speed ?? req.body.speedMps);
    const heading = toNullableNumber(
      req.body.heading ?? req.body.headingDegrees ?? req.body.heading_degrees
    );
    const requestedOrderId = req.body.orderId ??
      req.body.order_id ??
      req.body.currentOrderId ??
      req.body.current_order_id;

    if (latitude === null || longitude === null) {
      return res.status(400).json({
        message: "latitude and longitude are required."
      });
    }

    const coordinateError = validateCoordinatePair({
      latitude,
      longitude,
      requirePair: true
    });

    if (coordinateError) {
      return res.status(400).json({
        message: coordinateError
      });
    }

    const updatedDriver = await driverModel.updateDriverLocation(
      driverId,
      {
        latitude,
        longitude,
        currentLocation
      }
    );
    const trackedOrder = await resolveTrackedOrderForLocationUpdate(
      driverId,
      requestedOrderId
    );
    const trackedOrderId = trackedOrder ? Number(trackedOrder.id) : null;

    await createLocationHistoryEntry({
      driverId,
      orderId: trackedOrderId,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      source: "driver_app"
    });

    emitDriverUpdated(req.app.get("io"), updatedDriver, "driver_location_updated");

    if (shouldAttemptPendingRedispatch(updatedDriver)) {
      schedulePendingRedispatch(req.app.get("io"));
    }

    if (trackedOrder) {
      await evaluateRouteDeviation(
        {
          ...trackedOrder,
          driverLatitude: latitude,
          driverLongitude: longitude
        },
        {
          id: String(driverId),
          currentLatitude: latitude,
          currentLongitude: longitude
        }
      );
      await emitOrderTrackingUpdate(req.app.get("io"), trackedOrder);
    }

    return res.status(200).json({
      driver: driverModel.toDriverProfile(
        await driverModel.getDriverById(driverId)
      ),
      ...(trackedOrder
        ? { order: await enrichOrderTracking(trackedOrder) }
        : {})
    });
  } catch (error) {
    return next(error);
  }
}

async function registerPushToken(req, res, next) {
  try {
    const token = toNullableString(req.body.token ?? req.body.fcmToken);

    if (!token) {
      return res.status(400).json({
        message: "Push token is required."
      });
    }

    await driverModel.updateDriverPushToken(Number(req.driver.id), token);

    return res.status(200).json({
      message: "Push token registered successfully."
    });
  } catch (error) {
    return next(error);
  }
}

async function getAvailableOrders(req, res, next) {
  try {
    const search = toNullableString(req.query.search);
    const orders = await orderModel.getDriverAvailableOrders(Number(req.driver.id), {
      search
    });

    return res.status(200).json(orders);
  } catch (error) {
    return next(error);
  }
}

async function getActiveOrders(req, res, next) {
  try {
    const orders = await orderModel.getDriverActiveOrders(Number(req.driver.id));
    const includeTracking = shouldIncludeTracking(req.query.includeTracking);
    const responseOrders = includeTracking
      ? await enrichOrdersTracking(orders)
      : orders;
    return res.status(200).json(responseOrders);
  } catch (error) {
    return next(error);
  }
}

async function getOrderHistory(req, res, next) {
  try {
    const search = toNullableString(req.query.search);
    const orders = await orderModel.getDriverOrderHistory(Number(req.driver.id), {
      search
    });

    return res.status(200).json(orders);
  } catch (error) {
    return next(error);
  }
}

async function getDriverOrderDetails(req, res, next) {
  try {
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order id."
      });
    }

    const order = await orderModel.getDriverOrderById(
      orderId,
      Number(req.driver.id)
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found for this driver."
      });
    }

    const enrichedOrder = await enrichOrderTracking(order);

    return res.status(200).json(enrichedOrder);
  } catch (error) {
    return next(error);
  }
}

async function acceptOrder(req, res, next) {
  try {
    const orderId = Number(req.params.id);
    const driverId = Number(req.driver.id);

    if (Number.isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order id."
      });
    }

    const updatedOrder = await acceptDispatchedOrder({
      orderId,
      driverId,
      io: req.app.get("io")
    });
    const enrichedOrder = await enrichOrderTracking(updatedOrder);

    return res.status(200).json(enrichedOrder);
  } catch (error) {
    return next(error);
  }
}

async function rejectOrder(req, res, next) {
  try {
    const orderId = Number(req.params.id);
    const reason = toNullableString(req.body.reason);
    const driverId = Number(req.driver.id);

    if (Number.isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order id."
      });
    }
    await redispatchOrder({
      orderId,
      driverId,
      mode: "rejected",
      rejectionReason: reason,
      io: req.app.get("io")
    });

    schedulePendingRedispatch(req.app.get("io"));

    return res.status(200).json({
      message: "Order rejected for this driver."
    });
  } catch (error) {
    return next(error);
  }
}

async function updateOrderStage(req, res, next) {
  try {
    const orderId = Number(req.params.id);
    const nextStage = toNullableString(
      req.body.stage ?? req.body.driverStage ?? req.body.driver_stage
    )?.toLowerCase();
    const driverId = Number(req.driver.id);

    if (Number.isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order id."
      });
    }

    if (!nextStage || !ALLOWED_DRIVER_STAGES.has(nextStage)) {
      return res.status(400).json({
        message: "Invalid driver stage."
      });
    }

    const existingOrder = await orderModel.getOrderById(orderId);

    if (!existingOrder) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    if (Number(existingOrder.assigned_driver_id) !== driverId) {
      return res.status(403).json({
        message: "Only the assigned driver can update this order."
      });
    }

    const currentStage = normalizeDriverStage(existingOrder);

    if (
      currentStage !== nextStage &&
      !DRIVER_STAGE_TRANSITIONS[currentStage]?.has(nextStage)
    ) {
      return res.status(400).json({
        message: "Invalid driver stage transition."
      });
    }

    const nextStatus =
      nextStage === "delivered"
        ? "delivered"
        : nextStage === "cancelled"
          ? "cancelled"
          : "accepted";

    const updatedOrder = await orderModel.updateOrder(orderId, {
      status: nextStatus,
      driverStage: nextStage,
      assignedDriverId: driverId
    });
    const enrichedOrder = await enrichOrderTracking(updatedOrder);

    await syncRelatedDrivers(existingOrder, updatedOrder, req.app.get("io"));
    emitOrderEvents(req.app.get("io"), enrichedOrder);
    emitDriverNotification(req.app.get("io"), driverId, {
      type: nextStage,
      orderId: enrichedOrder.id,
      message: `Order #${enrichedOrder.id} updated to ${nextStage}.`
    });

    return res.status(200).json(enrichedOrder);
  } catch (error) {
    return next(error);
  }
}

async function getEarningsSummary(req, res, next) {
  try {
    const summary = await orderModel.getDriverEarningsSummary(Number(req.driver.id));
    return res.status(200).json(summary);
  } catch (error) {
    return next(error);
  }
}

async function getNotifications(req, res, next) {
  try {
    const notifications = await orderModel.getDriverNotifications(
      Number(req.driver.id)
    );

    return res.status(200).json(notifications);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDriverDashboard,
  getDriverProfile,
  updateAvailability,
  updateLocation,
  registerPushToken,
  getAvailableOrders,
  getActiveOrders,
  getOrderHistory,
  getDriverOrderDetails,
  acceptOrder,
  rejectOrder,
  updateOrderStage,
  getEarningsSummary,
  getNotifications
};
