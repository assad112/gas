const orderModel = require("../models/orderModel");
const customerModel = require("../models/customerModel");
const driverModel = require("../models/driverModel");
const { emitDriverUpdated } = require("./driverController");
const {
  enrichOrderTracking,
  enrichOrdersTracking
} = require("../services/trackingRouteService");
const { validateCoordinatePair } = require("../utils/coordinates");

const ADMIN_ROOM = "admin_dashboard";
const DRIVERS_ROOM = "drivers_live";

const STATUS_FLOW = {
  accepted: "delivered"
};

const ADMIN_STATUS_TRANSITIONS = {
  pending: new Set(["pending", "cancelled"]),
  accepted: new Set(["accepted", "delivered", "cancelled"]),
  delivered: new Set(["delivered"]),
  cancelled: new Set(["cancelled"])
};

const ALLOWED_STATUSES = new Set([
  "pending",
  "accepted",
  "delivered",
  "cancelled"
]);

const ALLOWED_DRIVER_STAGES = new Set([
  "new_order",
  "accepted",
  "on_the_way",
  "arrived",
  "delivered",
  "cancelled"
]);

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

function toPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value;
}

function readObjectValue(source, keys) {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }

  return undefined;
}

function toPositiveInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function normalizePaymentMethod(value) {
  const normalizedValue = toNullableString(value);

  if (!normalizedValue) {
    return "cash_on_delivery";
  }

  switch (normalizedValue.toLowerCase()) {
    case "cash":
    case "cash_on_delivery":
      return "cash_on_delivery";
    case "wallet":
    case "digital_wallet":
    case "digitalwallet":
      return "digital_wallet";
    default:
      return normalizedValue;
  }
}

function hasOrderCoordinateFields(body = {}) {
  return [
    "latitude",
    "longitude",
    "customerLatitude",
    "customerLongitude",
    "customer_latitude",
    "customer_longitude"
  ].some((field) => Object.prototype.hasOwnProperty.call(body, field));
}

function readOrderPayload(body = {}) {
  const customerLocation = toPlainObject(
    body.customerLocation ?? body.customer_location
  );
  const addressText = toNullableString(
    body.address_text ??
      body.addressText ??
      readObjectValue(customerLocation, [
        "addressText",
        "address_text",
        "addressFull",
        "address_full",
        "label"
      ]) ??
      body.address ??
      body.location
  );
  const addressFull = toNullableString(
    body.address_full ??
      body.addressFull ??
      readObjectValue(customerLocation, ["addressFull", "address_full"]) ??
      addressText ??
      body.location
  );
  const latitude = toNullableNumber(
    body.latitude ??
      body.customer_latitude ??
      body.customerLatitude ??
      readObjectValue(customerLocation, ["latitude", "lat"])
  );
  const longitude = toNullableNumber(
    body.longitude ??
      body.customer_longitude ??
      body.customerLongitude ??
      readObjectValue(customerLocation, ["longitude", "lng", "lon", "long"])
  );

  return {
    customerId: toNullableNumber(body.customerId ?? body.customer_id),
    location: toNullableString(body.location ?? addressText ?? addressFull),
    addressText,
    addressFull,
    gasType: toNullableString(body.gas_type ?? body.gasType),
    quantity: toPositiveInteger(body.quantity ?? body.qty) ?? 1,
    paymentMethod: normalizePaymentMethod(
      body.payment_method ?? body.paymentMethod
    ),
    notes: toNullableString(body.notes),
    preferredDeliveryWindow: toNullableString(
      body.preferred_delivery_window ?? body.preferredDeliveryWindow
    ),
    totalAmount: toNullableNumber(body.total_amount ?? body.totalAmount),
    latitude,
    longitude,
    customerLatitude: latitude,
    customerLongitude: longitude,
    driverStage: toNullableString(body.driver_stage ?? body.driverStage)
  };
}

function isPhaseThreeCreate(body, payload, authenticatedCustomer) {
  return Boolean(
    authenticatedCustomer ||
      payload.customerId ||
      Object.prototype.hasOwnProperty.call(body, "quantity") ||
      Object.prototype.hasOwnProperty.call(body, "addressText") ||
      Object.prototype.hasOwnProperty.call(body, "address_text") ||
      Object.prototype.hasOwnProperty.call(body, "latitude") ||
      Object.prototype.hasOwnProperty.call(body, "longitude")
  );
}

function emitOrderEvents(io, order, eventName = "order_updated") {
  if (!io || !order) {
    return;
  }

  const customerRoom = order.customer_id ? `customer:${order.customer_id}` : null;
  const assignedDriverRoom = order.assigned_driver_id
    ? `driver:${order.assigned_driver_id}`
    : null;
  const targetRooms = [
    ADMIN_ROOM,
    DRIVERS_ROOM,
    customerRoom,
    assignedDriverRoom
  ].filter(Boolean);

  for (const roomName of new Set(targetRooms)) {
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

  const customerRoom = trackingOrder.customer_id
    ? `customer:${trackingOrder.customer_id}`
    : null;
  const assignedDriverRoom = trackingOrder.assigned_driver_id
    ? `driver:${trackingOrder.assigned_driver_id}`
    : null;
  const targetRooms = [customerRoom, assignedDriverRoom].filter(Boolean);

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
    ...affectedCustomerIds.map((customerId) => `customer:${customerId}`)
  ];

  for (const roomName of new Set(targetRooms.filter(Boolean))) {
    io.to(roomName).emit("orders_reset", {
      deletedCount,
      resetAt: new Date().toISOString()
    });
  }
}

async function syncRelatedDrivers(previousOrder, updatedOrder) {
  const driverIds = new Set([
    previousOrder?.assigned_driver_id,
    updatedOrder?.assigned_driver_id
  ]);

  await Promise.all(
    [...driverIds]
      .filter(Boolean)
      .map((driverId) => driverModel.syncDriverAvailability(driverId))
  );
}

async function createOrder(req, res, next) {
  try {
    const { name, phone } = req.body;
    const customer = req.customer || null;
    const payload = readOrderPayload(req.body);
    const usingPhaseThreeContract = isPhaseThreeCreate(
      req.body,
      payload,
      customer
    );
    const coordinateError = validateCoordinatePair({
      latitude: payload.customerLatitude,
      longitude: payload.customerLongitude,
      requirePair: usingPhaseThreeContract || hasOrderCoordinateFields(req.body)
    });

    if (coordinateError) {
      return res.status(400).json({
        message: coordinateError
      });
    }

    let resolvedCustomer = customer;

    if (
      customer &&
      payload.customerId &&
      Number(customer.id) !== Number(payload.customerId)
    ) {
      return res.status(403).json({
        message: "Authenticated customer does not match the provided customerId."
      });
    }

    if (!resolvedCustomer && payload.customerId) {
      resolvedCustomer = await customerModel.findCustomerById(payload.customerId);
    }

    if (usingPhaseThreeContract) {
      if (!resolvedCustomer) {
        return res.status(404).json({
          message: "Customer was not found for the provided customerId."
        });
      }

      if (
        !payload.gasType ||
        !payload.addressText ||
        !payload.quantity ||
        payload.latitude === null ||
        payload.longitude === null
      ) {
        return res.status(400).json({
          message:
            "customerId, gasType, quantity, addressText, latitude, and longitude are required."
        });
      }
    }

    const resolvedName = resolvedCustomer?.fullName || name;
    const resolvedPhone = resolvedCustomer?.phone || phone;

    if (!usingPhaseThreeContract) {
      if (
        !isValidString(resolvedName) ||
        !isValidString(resolvedPhone) ||
        !payload.location ||
        !payload.gasType
      ) {
        return res.status(400).json({
          message: "name, phone, location, and gas_type are required."
        });
      }
    }

    const order = await orderModel.createOrder({
      customerId: resolvedCustomer ? Number(resolvedCustomer.id) : null,
      name: resolvedName.trim(),
      phone: resolvedPhone.trim(),
      location: payload.location,
      addressText: payload.addressText,
      addressFull: payload.addressFull,
      gasType: payload.gasType,
      quantity: payload.quantity,
      paymentMethod: payload.paymentMethod,
      notes: payload.notes,
      preferredDeliveryWindow: payload.preferredDeliveryWindow,
      totalAmount: payload.totalAmount,
      latitude: payload.latitude,
      longitude: payload.longitude,
      customerLatitude: payload.customerLatitude,
      customerLongitude: payload.customerLongitude
    });

    emitOrderEvents(req.app.get("io"), order, "new_order");
    return res.status(201).json({
      message: "Order created successfully.",
      order
    });
  } catch (error) {
    return next(error);
  }
}

async function getOrders(req, res, next) {
  try {
    const status = toNullableString(req.query.status);
    const search = toNullableString(req.query.search);
    const mineOnly = toNullableString(req.query.mine)?.toLowerCase() === "true";

    if (mineOnly && !req.customer) {
      return res.status(401).json({
        message: "Authentication token is required to fetch customer orders."
      });
    }

    const requestedCustomerId = toNullableNumber(
      req.query.customerId ?? req.query.customer_id
    );
    const customerId = req.customer
      ? Number(req.customer.id)
      : requestedCustomerId;
    const orders = await orderModel.getAllOrders({
      status,
      search,
      customerId
    });
    const enrichedOrders = await enrichOrdersTracking(orders);

    return res.status(200).json(enrichedOrders);
  } catch (error) {
    return next(error);
  }
}

async function resetOrders(req, res, next) {
  try {
    const resetResult = await orderModel.resetOrders();
    const io = req.app.get("io");

    emitOrdersReset(io, resetResult);

    const updatedDrivers = await Promise.all(
      resetResult.affectedDriverIds.map((driverId) =>
        driverModel.getDriverWithActiveOrderById(driverId)
      )
    );

    updatedDrivers.filter(Boolean).forEach((driver) => {
      emitDriverUpdated(io, driver);
    });

    return res.status(200).json({
      message: "Orders reset successfully.",
      deletedCount: resetResult.deletedCount
    });
  } catch (error) {
    return next(error);
  }
}

async function getOrderDetails(req, res, next) {
  try {
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order id."
      });
    }

    const order = await orderModel.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    const enrichedOrder = await enrichOrderTracking(order);

    return res.status(200).json(enrichedOrder);
  } catch (error) {
    return next(error);
  }
}

async function updateOrder(req, res, next) {
  try {
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order id."
      });
    }

    const existingOrder = await orderModel.getOrderById(orderId);

    if (!existingOrder) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    const nextStatus = toNullableString(req.body.status);
    const assignedDriverId = Object.prototype.hasOwnProperty.call(
      req.body,
      "assignedDriverId"
    )
      ? toNullableNumber(req.body.assignedDriverId)
      : Object.prototype.hasOwnProperty.call(req.body, "assigned_driver_id")
        ? toNullableNumber(req.body.assigned_driver_id)
        : undefined;

    if (nextStatus && !ALLOWED_STATUSES.has(nextStatus)) {
      return res.status(400).json({
        message: "Invalid order status."
      });
    }

    if (nextStatus === "accepted" && existingOrder.status === "pending") {
      return res.status(403).json({
        message: "Pending order must be accepted by a driver."
      });
    }

    if (
      nextStatus &&
      !ADMIN_STATUS_TRANSITIONS[existingOrder.status]?.has(nextStatus)
    ) {
      return res.status(400).json({
        message: "Invalid status transition for admin action."
      });
    }

    if (assignedDriverId !== undefined && assignedDriverId !== null) {
      const driver = await driverModel.getDriverById(assignedDriverId);

      if (!driver) {
        return res.status(404).json({
          message: "Assigned driver not found."
        });
      }
    }

    const payload = readOrderPayload(req.body);
    const coordinateError = validateCoordinatePair({
      latitude: payload.customerLatitude,
      longitude: payload.customerLongitude,
      requirePair: hasOrderCoordinateFields(req.body)
    });

    if (coordinateError) {
      return res.status(400).json({
        message: coordinateError
      });
    }

    if (payload.driverStage && !ALLOWED_DRIVER_STAGES.has(payload.driverStage)) {
      return res.status(400).json({
        message: "Invalid driver stage."
      });
    }

    const updatedOrder = await orderModel.updateOrder(orderId, {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(payload.driverStage ? { driverStage: payload.driverStage } : {}),
      ...(assignedDriverId !== undefined ? { assignedDriverId } : {}),
      ...(Object.prototype.hasOwnProperty.call(req.body, "paymentMethod") ||
      Object.prototype.hasOwnProperty.call(req.body, "payment_method")
        ? { paymentMethod: payload.paymentMethod }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(req.body, "addressText") ||
      Object.prototype.hasOwnProperty.call(req.body, "address_text")
        ? {
            addressText: payload.addressText,
            addressFull: payload.addressFull,
            location: payload.location
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(req.body, "quantity") ||
      Object.prototype.hasOwnProperty.call(req.body, "qty")
        ? { quantity: payload.quantity }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(req.body, "notes")
        ? { notes: payload.notes }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(
        req.body,
        "preferredDeliveryWindow"
      ) ||
      Object.prototype.hasOwnProperty.call(req.body, "preferred_delivery_window")
        ? { preferredDeliveryWindow: payload.preferredDeliveryWindow }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(req.body, "totalAmount") ||
      Object.prototype.hasOwnProperty.call(req.body, "total_amount")
        ? { totalAmount: payload.totalAmount }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(req.body, "customerLatitude") ||
      Object.prototype.hasOwnProperty.call(req.body, "customer_latitude") ||
      Object.prototype.hasOwnProperty.call(req.body, "latitude")
        ? {
            latitude: payload.latitude,
            customerLatitude: payload.customerLatitude
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(req.body, "customerLongitude") ||
      Object.prototype.hasOwnProperty.call(req.body, "customer_longitude") ||
      Object.prototype.hasOwnProperty.call(req.body, "longitude")
        ? {
            longitude: payload.longitude,
            customerLongitude: payload.customerLongitude
          }
        : {})
    });
    const enrichedOrder = await enrichOrderTracking(updatedOrder);

    await syncRelatedDrivers(existingOrder, updatedOrder);
    emitOrderEvents(req.app.get("io"), enrichedOrder);

    return res.status(200).json(enrichedOrder);
  } catch (error) {
    return next(error);
  }
}

async function cancelOrder(req, res, next) {
  req.body = {
    ...req.body,
    status: "cancelled",
    driverStage: "cancelled"
  };
  return updateOrder(req, res, next);
}

async function driverAcceptOrder(req, res, next) {
  try {
    const orderId = Number(req.params.id);
    const driverId = toNullableNumber(req.body.driverId ?? req.body.driver_id);

    if (Number.isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order id."
      });
    }

    if (!driverId) {
      return res.status(400).json({
        message: "driverId is required."
      });
    }

    const [existingOrder, driver] = await Promise.all([
      orderModel.getOrderById(orderId),
      driverModel.getDriverById(driverId)
    ]);

    if (!existingOrder) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found."
      });
    }

    if (existingOrder.status !== "pending") {
      return res.status(409).json({
        message: "Only pending orders can be accepted by driver."
      });
    }

    if (
      existingOrder.assigned_driver_id &&
      Number(existingOrder.assigned_driver_id) !== Number(driverId)
    ) {
      return res.status(409).json({
        message: "This order is already assigned to another driver."
      });
    }

    const updatedOrder = await orderModel.updateOrder(orderId, {
      status: "accepted",
      assignedDriverId: Number(driverId),
      driverStage: "accepted"
    });

    await syncRelatedDrivers(existingOrder, updatedOrder);
    emitOrderEvents(req.app.get("io"), updatedOrder);

    return res.status(200).json(updatedOrder);
  } catch (error) {
    return next(error);
  }
}

async function advanceOrderStatus(req, res, next) {
  try {
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order id."
      });
    }

    const existingOrder = await orderModel.getOrderById(orderId);

    if (!existingOrder) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    const nextStatus = STATUS_FLOW[existingOrder.status];

    if (!nextStatus) {
      return res.status(400).json({
        message: "Order cannot advance any further."
      });
    }

    req.body = {
      ...req.body,
      status: nextStatus
    };

    return updateOrder(req, res, next);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createOrder,
  getOrders,
  resetOrders,
  getOrderDetails,
  updateOrder,
  cancelOrder,
  driverAcceptOrder,
  advanceOrderStatus,
  emitOrderEvents,
  emitOrderTrackingUpdate,
  syncRelatedDrivers
};

