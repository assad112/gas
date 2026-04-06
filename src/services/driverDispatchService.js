const db = require("../config/db");
const driverModel = require("../models/driverModel");
const orderModel = require("../models/orderModel");
const { emitDriverUpdated } = require("../controllers/driverController");
const {
  emitDriverNotification,
  emitOrderEvents
} = require("./orderRealtimeService");

const dispatchTimers = new Map();
let activeIo = null;

function getDispatchTimeoutMs() {
  const parsedValue = Number.parseInt(
    String(process.env.DRIVER_DISPATCH_TIMEOUT_MS ?? "15000"),
    10
  );

  return Number.isInteger(parsedValue) && parsedValue >= 5000
    ? parsedValue
    : 15000;
}

function getDriverLocationFreshnessMs() {
  const parsedValue = Number.parseInt(
    String(process.env.DRIVER_LOCATION_FRESHNESS_MS ?? `${5 * 60 * 1000}`),
    10
  );

  return Number.isInteger(parsedValue) && parsedValue >= 60000
    ? parsedValue
    : 5 * 60 * 1000;
}

function createDispatchError(message, statusCode = 409) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toPositiveInteger(value) {
  const parsedValue = Number.parseInt(String(value), 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function normalizeAttemptedDriverIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toPositiveInteger(item))
    .filter(Boolean);
}

function appendAttemptedDriverId(driverIds, driverId) {
  const resolvedDriverId = toPositiveInteger(driverId);

  if (!resolvedDriverId) {
    return [...driverIds];
  }

  return driverIds.includes(resolvedDriverId)
    ? [...driverIds]
    : [...driverIds, resolvedDriverId];
}

function toCoordinate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function extractOrderCoordinates(orderRow) {
  const latitude = toCoordinate(
    orderRow?.customer_latitude ?? orderRow?.latitude
  );
  const longitude = toCoordinate(
    orderRow?.customer_longitude ?? orderRow?.longitude
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

function computeHaversineDistanceMeters(from, to) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(to.latitude);
  const sinLatitude = Math.sin(deltaLatitude / 2);
  const sinLongitude = Math.sin(deltaLongitude / 2);

  const a =
    sinLatitude * sinLatitude +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      sinLongitude *
      sinLongitude;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildOrderRoomSnapshot(orderRow) {
  if (!orderRow) {
    return null;
  }

  return {
    id: orderRow.id,
    customer_id: orderRow.customer_id,
    assigned_driver_id: orderRow.assigned_driver_id,
    current_candidate_driver_id: orderRow.current_candidate_driver_id
  };
}

function clearDispatchTimeout(orderId) {
  const resolvedOrderId = toPositiveInteger(orderId);

  if (!resolvedOrderId) {
    return;
  }

  const activeTimer = dispatchTimers.get(resolvedOrderId);

  if (activeTimer) {
    clearTimeout(activeTimer);
    dispatchTimers.delete(resolvedOrderId);
  }
}

function clearAllDispatchTimeouts() {
  for (const orderId of dispatchTimers.keys()) {
    clearDispatchTimeout(orderId);
  }
}

async function lockOrderForDispatch(client, orderId) {
  const result = await client.query(
    `
      SELECT
        o.id,
        o.customer_id,
        o.status,
        o.driver_stage,
        o.assigned_driver_id,
        o.current_candidate_driver_id,
        COALESCE(o.customer_latitude, o.latitude) AS customer_latitude,
        COALESCE(o.customer_longitude, o.longitude) AS customer_longitude,
        o.attempted_driver_ids,
        o.dispatch_started_at,
        o.dispatch_expires_at
      FROM orders o
      WHERE o.id = $1
      LIMIT 1
      FOR UPDATE;
    `,
    [orderId]
  );

  return result.rows[0] || null;
}

async function findEligibleDrivers(client, orderRow, attemptedDriverIds) {
  const customerCoordinates = extractOrderCoordinates(orderRow);

  if (!customerCoordinates) {
    return [];
  }

  const result = await client.query(
    `
      SELECT
        d.id,
        d.current_latitude,
        d.current_longitude,
        d.last_location_at
      FROM drivers d
      WHERE d.status = 'online'
        AND d.availability = 'available'
        AND d.current_latitude IS NOT NULL
        AND d.current_longitude IS NOT NULL
        AND d.last_location_at IS NOT NULL
        AND d.last_location_at >= NOW() - ($1::INTEGER * INTERVAL '1 millisecond')
        AND NOT (d.id = ANY($2::INTEGER[]))
        AND NOT EXISTS (
          SELECT 1
          FROM orders offered_order
          WHERE offered_order.current_candidate_driver_id = d.id
            AND offered_order.id <> $3
            AND offered_order.status = 'pending'
            AND offered_order.driver_stage = 'driver_notified'
            AND offered_order.dispatch_expires_at IS NOT NULL
            AND offered_order.dispatch_expires_at > NOW()
        );
    `,
    [getDriverLocationFreshnessMs(), attemptedDriverIds, orderRow.id]
  );

  return result.rows
    .map((row) => {
      const driverCoordinates = {
        latitude: Number(row.current_latitude),
        longitude: Number(row.current_longitude)
      };

      return {
        id: Number(row.id),
        distanceMeters: computeHaversineDistanceMeters(
          customerCoordinates,
          driverCoordinates
        ),
        lastLocationAt: row.last_location_at
      };
    })
    .filter((driver) => Number.isFinite(driver.distanceMeters))
    .sort((left, right) => {
      if (left.distanceMeters !== right.distanceMeters) {
        return left.distanceMeters - right.distanceMeters;
      }

      return (
        new Date(right.lastLocationAt).getTime() -
        new Date(left.lastLocationAt).getTime()
      );
    });
}

function isOfferStillActive(orderRow) {
  const expiresAt = orderRow?.dispatch_expires_at
    ? new Date(orderRow.dispatch_expires_at).getTime()
    : null;

  return Boolean(
    orderRow &&
      orderRow.status === "pending" &&
      orderRow.driver_stage === "driver_notified" &&
      toPositiveInteger(orderRow.current_candidate_driver_id) &&
      expiresAt &&
      expiresAt > Date.now()
  );
}

async function cycleOrderDispatch({
  orderId,
  mode,
  driverId = null,
  rejectionReason = null
}) {
  const pool = await db.getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentOrder = await lockOrderForDispatch(client, orderId);

    if (!currentOrder) {
      throw createDispatchError("Order not found.", 404);
    }

    const previousOrder = buildOrderRoomSnapshot(currentOrder);
    const currentCandidateDriverId = toPositiveInteger(
      currentOrder.current_candidate_driver_id
    );
    let attemptedDriverIds = normalizeAttemptedDriverIds(
      currentOrder.attempted_driver_ids
    );

    if (currentOrder.status !== "pending") {
      await client.query("COMMIT");

      return {
        order: await orderModel.getOrderById(orderId),
        previousOrder,
        eventName: "order_updated",
        shouldEmit: false,
        notifiedDriverId: null,
        expiredDriverId: null
      };
    }

    if (mode === "resume" && isOfferStillActive(currentOrder)) {
      await client.query("COMMIT");

      return {
        order: await orderModel.getOrderById(orderId),
        previousOrder,
        eventName: "order_updated",
        shouldEmit: false,
        notifiedDriverId: currentCandidateDriverId,
        expiredDriverId: null
      };
    }

    if (
      mode === "timeout" &&
      currentCandidateDriverId &&
      toPositiveInteger(driverId) &&
      toPositiveInteger(driverId) !== currentCandidateDriverId
    ) {
      await client.query("COMMIT");

      return {
        order: await orderModel.getOrderById(orderId),
        previousOrder,
        eventName: "order_updated",
        shouldEmit: false,
        notifiedDriverId: currentCandidateDriverId,
        expiredDriverId: null
      };
    }

    if (mode === "rejected") {
      const resolvedDriverId = toPositiveInteger(driverId);

      if (!resolvedDriverId) {
        throw createDispatchError("Driver id is required.", 400);
      }

      if (currentCandidateDriverId !== resolvedDriverId) {
        throw createDispatchError(
          "This order is no longer assigned to your live queue.",
          409
        );
      }

      await client.query(
        `
          INSERT INTO driver_order_rejections (
            driver_id,
            order_id,
            reason,
            rejected_at
          )
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (driver_id, order_id)
          DO UPDATE SET
            reason = EXCLUDED.reason,
            rejected_at = NOW();
        `,
        [resolvedDriverId, orderId, rejectionReason]
      );

      attemptedDriverIds = appendAttemptedDriverId(
        attemptedDriverIds,
        resolvedDriverId
      );
    } else if (
      (mode === "timeout" || mode === "resume") &&
      currentCandidateDriverId
    ) {
      const resolvedDriverId = toPositiveInteger(driverId);

      if (!resolvedDriverId || resolvedDriverId === currentCandidateDriverId) {
        attemptedDriverIds = appendAttemptedDriverId(
          attemptedDriverIds,
          currentCandidateDriverId
        );
      }
    }

    const eligibleDrivers = await findEligibleDrivers(
      client,
      currentOrder,
      attemptedDriverIds
    );

    if (!eligibleDrivers.length) {
      await client.query(
        `
          UPDATE orders
          SET driver_stage = 'no_driver_found',
              current_candidate_driver_id = NULL,
              attempted_driver_ids = $2::INTEGER[],
              dispatch_started_at = NULL,
              dispatch_expires_at = NULL,
              updated_at = NOW()
          WHERE id = $1;
        `,
        [orderId, attemptedDriverIds]
      );

      await client.query("COMMIT");

      return {
        order: await orderModel.getOrderById(orderId),
        previousOrder,
        eventName: mode === "created" ? "new_order" : "order_updated",
        shouldEmit: true,
        notifiedDriverId: null,
        expiredDriverId: currentCandidateDriverId
      };
    }

    const nextDriver = eligibleDrivers[0];
    const dispatchExpiresAt = new Date(Date.now() + getDispatchTimeoutMs());

    await client.query(
      `
        UPDATE orders
        SET driver_stage = 'driver_notified',
            current_candidate_driver_id = $2,
            attempted_driver_ids = $3::INTEGER[],
            dispatch_started_at = NOW(),
            dispatch_expires_at = $4,
            updated_at = NOW()
        WHERE id = $1;
      `,
      [orderId, nextDriver.id, attemptedDriverIds, dispatchExpiresAt]
    );

    await client.query("COMMIT");

    return {
      order: await orderModel.getOrderById(orderId),
      previousOrder,
      eventName: mode === "created" ? "new_order" : "order_updated",
      shouldEmit: true,
      notifiedDriverId: nextDriver.id,
      expiredDriverId:
        currentCandidateDriverId && currentCandidateDriverId !== nextDriver.id
          ? currentCandidateDriverId
          : null
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function scheduleDispatchTimeout(order) {
  const orderId = toPositiveInteger(order?.id);
  const candidateDriverId = toPositiveInteger(
    order?.current_candidate_driver_id ?? order?.currentCandidateDriverId
  );
  const expiresAtRaw =
    order?.dispatch_expires_at ?? order?.dispatchExpiresAt ?? null;

  if (!orderId || !candidateDriverId || !expiresAtRaw) {
    clearDispatchTimeout(orderId);
    return;
  }

  const expiresAt = new Date(expiresAtRaw).getTime();

  if (!Number.isFinite(expiresAt)) {
    clearDispatchTimeout(orderId);
    return;
  }

  clearDispatchTimeout(orderId);

  const delayMs = Math.max(0, expiresAt - Date.now());
  const timeoutHandle = setTimeout(() => {
    dispatchTimers.delete(orderId);
    handleDispatchTimeout(orderId, candidateDriverId).catch((error) => {
      console.error(
        `Dispatch timeout handling failed for order ${orderId}: ${error.message}`
      );
    });
  }, delayMs);

  dispatchTimers.set(orderId, timeoutHandle);
}

async function finalizeDispatchCycle(result, { notifyRejectedDriver = null } = {}) {
  const io = activeIo;

  if (!result?.order) {
    return null;
  }

  if (result.order.driver_stage === "driver_notified") {
    scheduleDispatchTimeout(result.order);
  } else {
    clearDispatchTimeout(result.order.id);
  }

  if (!result.shouldEmit) {
    return result.order;
  }

  emitOrderEvents(io, result.order, result.eventName, {
    previousOrder: result.previousOrder,
    extraDriverIds: [result.expiredDriverId, notifyRejectedDriver]
  });

  if (result.notifiedDriverId) {
    emitDriverNotification(io, result.notifiedDriverId, {
      type: "new_order",
      orderId: result.order.id,
      message: `Order #${result.order.id} is waiting for your response.`,
      expiresAt:
        result.order.dispatch_expires_at ?? result.order.dispatchExpiresAt
    });
  }

  if (result.expiredDriverId) {
    emitDriverNotification(io, result.expiredDriverId, {
      type: "offer_timeout",
      orderId: result.order.id,
      message: `Order #${result.order.id} was forwarded to another driver.`
    });
  }

  if (notifyRejectedDriver) {
    emitDriverNotification(io, notifyRejectedDriver, {
      type: "rejected",
      orderId: result.order.id,
      message: `Order #${result.order.id} has been removed from your queue.`
    });
  }

  return result.order;
}

async function dispatchNewOrder({ orderId, io = null } = {}) {
  if (io) {
    activeIo = io;
  }

  const result = await cycleOrderDispatch({
    orderId,
    mode: "created"
  });

  return finalizeDispatchCycle(result);
}

async function redispatchOrder({
  orderId,
  driverId = null,
  rejectionReason = null,
  mode = "timeout",
  io = null
} = {}) {
  if (io) {
    activeIo = io;
  }

  const resolvedDriverId = toPositiveInteger(driverId);
  const result = await cycleOrderDispatch({
    orderId,
    driverId: resolvedDriverId,
    rejectionReason,
    mode
  });

  return finalizeDispatchCycle(result, {
    notifyRejectedDriver: mode === "rejected" ? resolvedDriverId : null
  });
}

async function acceptDispatchedOrder({ orderId, driverId, io = null } = {}) {
  if (io) {
    activeIo = io;
  }

  const resolvedOrderId = toPositiveInteger(orderId);
  const resolvedDriverId = toPositiveInteger(driverId);

  if (!resolvedOrderId) {
    throw createDispatchError("Invalid order id.", 400);
  }

  if (!resolvedDriverId) {
    throw createDispatchError("Driver id is required.", 400);
  }

  const pool = await db.getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentOrder = await lockOrderForDispatch(client, resolvedOrderId);

    if (!currentOrder) {
      throw createDispatchError("Order not found.", 404);
    }

    const previousOrder = buildOrderRoomSnapshot(currentOrder);

    if (
      currentOrder.status === "accepted" &&
      toPositiveInteger(currentOrder.assigned_driver_id) === resolvedDriverId
    ) {
      await client.query("COMMIT");
      clearDispatchTimeout(resolvedOrderId);
      return orderModel.getOrderById(resolvedOrderId);
    }

    if (currentOrder.status !== "pending") {
      throw createDispatchError("Only pending orders can be accepted.", 409);
    }

    if (
      toPositiveInteger(currentOrder.current_candidate_driver_id) !==
      resolvedDriverId
    ) {
      throw createDispatchError(
        "This order is no longer assigned to your live queue.",
        409
      );
    }

    const driverResult = await client.query(
      `
        SELECT id, status, availability
        FROM drivers
        WHERE id = $1
        LIMIT 1
        FOR UPDATE;
      `,
      [resolvedDriverId]
    );

    if (!driverResult.rows[0]) {
      throw createDispatchError("Driver not found.", 404);
    }

    if (driverResult.rows[0].status !== "online") {
      throw createDispatchError(
        "Driver must be online before accepting a live order.",
        409
      );
    }

    if (driverResult.rows[0].availability === "busy") {
      throw createDispatchError(
        "Driver is currently busy with another order.",
        409
      );
    }

    await client.query(
      `
        UPDATE orders
        SET status = 'accepted',
            driver_stage = 'accepted',
            assigned_driver_id = $2,
            current_candidate_driver_id = NULL,
            dispatch_started_at = NULL,
            dispatch_expires_at = NULL,
            accepted_at = COALESCE(accepted_at, NOW()),
            updated_at = NOW()
        WHERE id = $1;
      `,
      [resolvedOrderId, resolvedDriverId]
    );

    await client.query("COMMIT");

    clearDispatchTimeout(resolvedOrderId);
    const updatedOrder = await orderModel.getOrderById(resolvedOrderId);
    await driverModel.syncDriverAvailability(resolvedDriverId);
    const updatedDriver = await driverModel.getDriverWithActiveOrderById(
      resolvedDriverId
    );

    emitOrderEvents(activeIo, updatedOrder, "order_updated", {
      previousOrder
    });
    emitDriverUpdated(activeIo, updatedDriver);
    emitDriverNotification(activeIo, resolvedDriverId, {
      type: "accepted",
      orderId: updatedOrder.id,
      message: `Order #${updatedOrder.id} has been assigned to you.`
    });

    return updatedOrder;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function handleDispatchTimeout(orderId, driverId) {
  try {
    const updatedOrder = await redispatchOrder({
      orderId,
      driverId,
      mode: "timeout",
      io: activeIo
    });

    if (updatedOrder?.driver_stage !== "driver_notified") {
      await resumePendingDispatches(activeIo);
    }
  } catch (error) {
    console.error(
      `Failed to re-dispatch timed out order ${orderId}: ${error.message}`
    );
  }
}

async function resumePendingDispatches(io = null) {
  if (io) {
    activeIo = io;
  }

  const result = await db.query(
    `
      SELECT id
      FROM orders
      WHERE status = 'pending'
        AND driver_stage IN (
          'new_order',
          'searching_driver',
          'driver_notified',
          'no_driver_found'
        )
      ORDER BY created_at ASC;
    `
  );

  for (const row of result.rows) {
    try {
      const dispatchResult = await cycleOrderDispatch({
        orderId: row.id,
        mode: "resume"
      });

      await finalizeDispatchCycle(dispatchResult);
    } catch (error) {
      console.error(
        `Failed to resume dispatch for order ${row.id}: ${error.message}`
      );
    }
  }
}

function configureDispatchRuntime(io) {
  activeIo = io || null;
}

module.exports = {
  acceptDispatchedOrder,
  clearAllDispatchTimeouts,
  clearDispatchTimeout,
  configureDispatchRuntime,
  dispatchNewOrder,
  redispatchOrder,
  resumePendingDispatches
};
