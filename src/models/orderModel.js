const db = require("../config/db");

const baseOrderSelect = `
  SELECT
    o.id,
    o.customer_id,
    o.name,
    o.phone,
    o.location,
    COALESCE(o.address_text, o.address_full, o.location) AS address_text,
    COALESCE(o.address_full, o.address_text, o.location) AS address_full,
    o.gas_type,
    o.quantity,
    o.payment_method,
    o.notes,
    o.preferred_delivery_window,
    o.total_amount,
    o.status,
    o.driver_stage,
    o.assigned_driver_id,
    o.current_candidate_driver_id,
    o.attempted_driver_ids,
    o.dispatch_started_at,
    o.dispatch_expires_at,
    COALESCE(o.latitude, o.customer_latitude) AS latitude,
    COALESCE(o.longitude, o.customer_longitude) AS longitude,
    o.customer_latitude,
    o.customer_longitude,
    o.accepted_at,
    o.delivered_at,
    o.created_at,
    o.updated_at,
    o.cancelled_at,
    c.full_name AS customer_full_name,
    c.email AS customer_email,
    d.name AS driver_name,
    d.phone AS driver_phone,
    d.status AS driver_status,
    d.availability AS driver_availability,
    d.current_location AS driver_location,
    d.current_latitude AS driver_latitude,
    d.current_longitude AS driver_longitude,
    d.vehicle_label AS driver_vehicle_label
  FROM orders o
  LEFT JOIN customers c
    ON c.id = o.customer_id
  LEFT JOIN drivers d
    ON d.id = o.assigned_driver_id
`;

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function buildLocationPayload({
  latitude,
  longitude,
  addressText = null,
  addressFull = null
}) {
  const nextLatitude = toNullableNumber(latitude);
  const nextLongitude = toNullableNumber(longitude);

  if (nextLatitude === null || nextLongitude === null) {
    return null;
  }

  return {
    latitude: nextLatitude,
    longitude: nextLongitude,
    lat: nextLatitude,
    lng: nextLongitude,
    ...(addressText ? { addressText } : {}),
    ...(addressFull ? { addressFull } : {})
  };
}

function buildDriverSnapshot(row) {
  if (!row.assigned_driver_id) {
    return null;
  }

  return {
    id: row.assigned_driver_id,
    name: row.driver_name,
    phone: row.driver_phone,
    vehicleLabel: row.driver_vehicle_label
  };
}

function normalizeDriverIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number.parseInt(String(item), 10))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function resolvePublicStatus(row) {
  if (!row) {
    return "pending";
  }

  const status = String(row.status || "").trim().toLowerCase();
  const driverStage = String(row.driver_stage || "").trim().toLowerCase();

  if (status === "cancelled" || driverStage === "cancelled") {
    return "cancelled";
  }

  if (status === "delivered" || driverStage === "delivered") {
    return "delivered";
  }

  if (status === "accepted") {
    if (driverStage === "on_the_way" || driverStage === "arrived") {
      return "on_the_way";
    }

    return "accepted";
  }

  if (driverStage === "no_driver_found") {
    return "no_driver_found";
  }

  if (driverStage === "driver_notified") {
    return "driver_notified";
  }

  if (driverStage === "searching_driver") {
    return "searching_driver";
  }

  return status || "pending";
}

function serializeOrderRow(row) {
  if (!row) {
    return null;
  }

  const orderId = `ORD-${row.id}`;
  const addressText = row.address_text ?? row.address_full ?? row.location;
  const addressFull = row.address_full ?? row.address_text ?? row.location;
  const customerLatitude = toNullableNumber(
    row.customer_latitude ?? row.latitude
  );
  const customerLongitude = toNullableNumber(
    row.customer_longitude ?? row.longitude
  );
  const driverLatitude = toNullableNumber(row.driver_latitude);
  const driverLongitude = toNullableNumber(row.driver_longitude);
  const customerLocation = buildLocationPayload({
    latitude: customerLatitude,
    longitude: customerLongitude,
    addressText,
    addressFull
  });
  const driverLocation = buildLocationPayload({
    latitude: driverLatitude,
    longitude: driverLongitude
  });
  const driverSnapshot = buildDriverSnapshot(row);
  const attemptedDriverIds = normalizeDriverIds(row.attempted_driver_ids);
  const currentCandidateDriverId =
    row.current_candidate_driver_id === null ||
    row.current_candidate_driver_id === undefined
      ? null
      : Number(row.current_candidate_driver_id);
  const publicStatus = resolvePublicStatus(row);

  return {
    ...row,
    orderId,
    order_id: orderId,
    addressText,
    addressFull,
    gasType: row.gas_type,
    paymentMethod: row.payment_method,
    preferredDeliveryWindow: row.preferred_delivery_window,
    totalAmount: row.total_amount,
    customerLatitude,
    customerLongitude,
    latitude: customerLatitude,
    longitude: customerLongitude,
    driverLatitude,
    driverLongitude,
    driverVehicleLabel: row.driver_vehicle_label,
    currentCandidateDriverId,
    current_candidate_driver_id: currentCandidateDriverId,
    attemptedDriverIds,
    attempted_driver_ids: attemptedDriverIds,
    dispatchStartedAt: row.dispatch_started_at,
    dispatch_started_at: row.dispatch_started_at,
    dispatchExpiresAt: row.dispatch_expires_at,
    dispatch_expires_at: row.dispatch_expires_at,
    publicStatus,
    public_status: publicStatus,
    customerLocation,
    customer_location: customerLocation,
    driverLocation,
    driverSnapshot,
    driver_snapshot: driverSnapshot
  };
}

function buildOrdersWhereClause({ status, search, customerId }) {
  const conditions = [];
  const params = [];

  if (customerId) {
    params.push(customerId);
    conditions.push(`o.customer_id = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const placeholder = `$${params.length}`;
    conditions.push(`
      (
        CAST(o.id AS TEXT) ILIKE ${placeholder}
        OR o.name ILIKE ${placeholder}
        OR o.phone ILIKE ${placeholder}
        OR o.location ILIKE ${placeholder}
        OR COALESCE(o.address_text, o.address_full, o.location) ILIKE ${placeholder}
        OR COALESCE(o.address_full, o.address_text, o.location) ILIKE ${placeholder}
        OR o.gas_type ILIKE ${placeholder}
        OR COALESCE(o.payment_method, '') ILIKE ${placeholder}
        OR COALESCE(o.notes, '') ILIKE ${placeholder}
        OR o.status ILIKE ${placeholder}
        OR COALESCE(o.driver_stage, '') ILIKE ${placeholder}
      )
    `);
  }

  return {
    params,
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
  };
}

function resolveDriverStageFromStatus(status) {
  if (status === "accepted") {
    return "accepted";
  }

  if (status === "delivered") {
    return "delivered";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  return null;
}

async function createOrder({
  customerId = null,
  name,
  phone,
  location,
  addressText = null,
  addressFull = null,
  gasType,
  quantity = 1,
  paymentMethod = "cash_on_delivery",
  notes = null,
  preferredDeliveryWindow = null,
  totalAmount = null,
  latitude = null,
  longitude = null,
  customerLatitude = null,
  customerLongitude = null
}) {
  const result = await db.query(
    `
      INSERT INTO orders (
        customer_id,
        name,
        phone,
        location,
        address_text,
        address_full,
        gas_type,
        quantity,
        payment_method,
        notes,
        preferred_delivery_window,
        total_amount,
        latitude,
        longitude,
        customer_latitude,
        customer_longitude,
        driver_stage,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'searching_driver', NOW()
      )
      RETURNING id;
    `,
    [
      customerId,
      name,
      phone,
      location,
      addressText || addressFull || location,
      addressFull || addressText || location,
      gasType,
      quantity,
      paymentMethod,
      notes,
      preferredDeliveryWindow,
      totalAmount,
      latitude,
      longitude,
      customerLatitude,
      customerLongitude
    ]
  );

  return getOrderById(result.rows[0]?.id);
}

async function getAllOrders(options = {}) {
  const { params, whereClause } = buildOrdersWhereClause(options);
  const result = await db.query(
    `
      ${baseOrderSelect}
      ${whereClause}
      ORDER BY COALESCE(o.updated_at, o.created_at) DESC, o.created_at DESC;
    `,
    params
  );

  return result.rows.map(serializeOrderRow);
}

async function getOrderById(id) {
  const result = await db.query(
    `
      ${baseOrderSelect}
      WHERE o.id = $1
      LIMIT 1;
    `,
    [id]
  );

  return serializeOrderRow(result.rows[0] || null);
}

async function resetOrders() {
  const pool = await db.getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const [{ rows: countRows }, { rows: impactedRows }] = await Promise.all([
      client.query(`
        SELECT COUNT(*)::INTEGER AS count
        FROM orders;
      `),
      client.query(`
        SELECT DISTINCT
          assigned_driver_id AS driver_id,
          customer_id
        FROM orders
        WHERE assigned_driver_id IS NOT NULL
           OR customer_id IS NOT NULL;
      `)
    ]);

    await client.query("TRUNCATE TABLE orders RESTART IDENTITY CASCADE;");
    await client.query(`
      UPDATE drivers
      SET availability = 'available',
          updated_at = NOW()
      WHERE availability <> 'available';
    `);

    await client.query("COMMIT");

    return {
      deletedCount: countRows[0]?.count || 0,
      affectedDriverIds: [
        ...new Set(
          impactedRows
            .map((row) => Number(row.driver_id))
            .filter((driverId) => Number.isInteger(driverId) && driverId > 0)
        )
      ],
      affectedCustomerIds: [
        ...new Set(
          impactedRows
            .map((row) => Number(row.customer_id))
            .filter((customerId) => Number.isInteger(customerId) && customerId > 0)
        )
      ]
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function getDriverOrderById(orderId, driverId) {
  const result = await db.query(
    `
      ${baseOrderSelect}
      WHERE o.id = $1
        AND (
          (
            o.status = 'pending'
            AND o.current_candidate_driver_id = $2
            AND o.driver_stage = 'driver_notified'
            AND (o.dispatch_expires_at IS NULL OR o.dispatch_expires_at > NOW())
          )
          OR o.assigned_driver_id = $2
        )
      LIMIT 1;
    `,
    [orderId, driverId]
  );

  return result.rows[0] || null;
}

async function updateOrder(id, changes = {}) {
  const updates = new Map();

  function setValue(column, value) {
    updates.set(column, {
      type: "value",
      column,
      value
    });
  }

  function setExpression(column, expression) {
    updates.set(column, {
      type: "expression",
      column,
      expression
    });
  }

  if ("status" in changes) {
    setValue("status", changes.status);

    if (changes.status === "cancelled") {
      setExpression("cancelled_at", "NOW()");
    } else if (changes.status === "delivered") {
      setExpression("cancelled_at", "NULL");
      setExpression("delivered_at", "NOW()");
    } else {
      setExpression("cancelled_at", "NULL");
    }

    if (changes.status !== "pending") {
      setExpression("current_candidate_driver_id", "NULL");
      setExpression("dispatch_started_at", "NULL");
      setExpression("dispatch_expires_at", "NULL");
    }
  }

  if ("driverStage" in changes) {
    setValue("driver_stage", changes.driverStage);

    if (changes.driverStage === "accepted") {
      setExpression("accepted_at", "COALESCE(accepted_at, NOW())");
    }

    if (changes.driverStage === "delivered") {
      setExpression("delivered_at", "NOW()");
    }

    if (changes.driverStage === "cancelled") {
      setExpression("cancelled_at", "NOW()");
    }

    if (
      changes.driverStage === "accepted" ||
      changes.driverStage === "delivered" ||
      changes.driverStage === "cancelled" ||
      changes.driverStage === "no_driver_found"
    ) {
      setExpression("current_candidate_driver_id", "NULL");
      setExpression("dispatch_started_at", "NULL");
      setExpression("dispatch_expires_at", "NULL");
    }
  } else if ("status" in changes) {
    const inferredStage = resolveDriverStageFromStatus(changes.status);

    if (inferredStage) {
      setValue("driver_stage", inferredStage);
    }

    if (changes.status === "accepted") {
      setExpression("accepted_at", "COALESCE(accepted_at, NOW())");
    }
  }

  if ("assignedDriverId" in changes) {
    setValue("assigned_driver_id", changes.assignedDriverId);

    if (changes.assignedDriverId !== null) {
      setExpression("current_candidate_driver_id", "NULL");
      setExpression("dispatch_started_at", "NULL");
      setExpression("dispatch_expires_at", "NULL");
    }
  }

  if ("paymentMethod" in changes) {
    setValue("payment_method", changes.paymentMethod);
  }

  if ("location" in changes) {
    setValue("location", changes.location);
  }

  if ("addressText" in changes) {
    setValue("address_text", changes.addressText);
  }

  if ("addressFull" in changes) {
    setValue("address_full", changes.addressFull);
  }

  if ("quantity" in changes) {
    setValue("quantity", changes.quantity);
  }

  if ("notes" in changes) {
    setValue("notes", changes.notes);
  }

  if ("preferredDeliveryWindow" in changes) {
    setValue("preferred_delivery_window", changes.preferredDeliveryWindow);
  }

  if ("totalAmount" in changes) {
    setValue("total_amount", changes.totalAmount);
  }

  if ("customerLatitude" in changes) {
    setValue("customer_latitude", changes.customerLatitude);
  }

  if ("customerLongitude" in changes) {
    setValue("customer_longitude", changes.customerLongitude);
  }

  if ("latitude" in changes) {
    setValue("latitude", changes.latitude);
  }

  if ("longitude" in changes) {
    setValue("longitude", changes.longitude);
  }

  if (updates.size === 0) {
    return getOrderById(id);
  }

  const values = [id];
  const assignments = [];

  for (const update of updates.values()) {
    if (update.type === "value") {
      values.push(update.value);
      assignments.push(`${update.column} = $${values.length}`);
      continue;
    }

    assignments.push(`${update.column} = ${update.expression}`);
  }

  assignments.push("updated_at = NOW()");

  const result = await db.query(
    `
      UPDATE orders
      SET ${assignments.join(", ")}
      WHERE id = $1
      RETURNING id;
    `,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return getOrderById(id);
}

async function getDriverAvailableOrders(driverId, { search = null } = {}) {
  const params = [driverId];
  const conditions = [
    "o.status = 'pending'",
    "o.current_candidate_driver_id = $1",
    "o.driver_stage = 'driver_notified'",
    "(o.dispatch_expires_at IS NULL OR o.dispatch_expires_at > NOW())"
  ];

  if (search) {
    params.push(`%${search}%`);
    const placeholder = `$${params.length}`;
    conditions.push(`
      (
        CAST(o.id AS TEXT) ILIKE ${placeholder}
        OR o.name ILIKE ${placeholder}
        OR o.phone ILIKE ${placeholder}
        OR o.location ILIKE ${placeholder}
        OR COALESCE(o.address_text, o.address_full, o.location) ILIKE ${placeholder}
        OR COALESCE(o.address_full, o.address_text, o.location) ILIKE ${placeholder}
        OR o.gas_type ILIKE ${placeholder}
      )
    `);
  }

  const result = await db.query(
    `
      ${baseOrderSelect}
      WHERE ${conditions.join(" AND ")}
      ORDER BY COALESCE(o.updated_at, o.created_at) DESC, o.created_at DESC;
    `,
    params
  );

  return result.rows;
}

async function getDriverActiveOrders(driverId) {
  const result = await db.query(
    `
      ${baseOrderSelect}
      WHERE o.assigned_driver_id = $1
        AND o.status = 'accepted'
        AND o.driver_stage IN ('accepted', 'on_the_way', 'arrived')
      ORDER BY COALESCE(o.updated_at, o.created_at) DESC, o.created_at DESC;
    `,
    [driverId]
  );

  return result.rows;
}

async function getDriverOrderHistory(driverId, { search = null } = {}) {
  const params = [driverId];
  const conditions = [
    "o.assigned_driver_id = $1",
    "o.status IN ('delivered', 'cancelled')"
  ];

  if (search) {
    params.push(`%${search}%`);
    const placeholder = `$${params.length}`;
    conditions.push(`
      (
        CAST(o.id AS TEXT) ILIKE ${placeholder}
        OR o.name ILIKE ${placeholder}
        OR o.phone ILIKE ${placeholder}
        OR o.location ILIKE ${placeholder}
        OR COALESCE(o.address_text, o.address_full, o.location) ILIKE ${placeholder}
        OR COALESCE(o.address_full, o.address_text, o.location) ILIKE ${placeholder}
        OR o.gas_type ILIKE ${placeholder}
      )
    `);
  }

  const result = await db.query(
    `
      ${baseOrderSelect}
      WHERE ${conditions.join(" AND ")}
      ORDER BY COALESCE(o.delivered_at, o.cancelled_at, o.updated_at, o.created_at) DESC, o.created_at DESC;
    `,
    params
  );

  return result.rows;
}

async function getDriverEarningsSummary(driverId) {
  const result = await db.query(
    `
      SELECT
        COUNT(*)::INTEGER AS completed_orders,
        COALESCE(
          SUM(
            CASE
              WHEN DATE(COALESCE(delivered_at, updated_at, created_at)) = CURRENT_DATE
              THEN COALESCE(total_amount, 0)
              ELSE 0
            END
          ),
          0
        )::NUMERIC(10,3) AS today_earnings,
        COALESCE(
          SUM(
            CASE
              WHEN DATE(COALESCE(delivered_at, updated_at, created_at)) >= CURRENT_DATE - INTERVAL '6 day'
              THEN COALESCE(total_amount, 0)
              ELSE 0
            END
          ),
          0
        )::NUMERIC(10,3) AS weekly_earnings,
        COALESCE(
          SUM(
            CASE
              WHEN DATE_TRUNC('month', COALESCE(delivered_at, updated_at, created_at))
                   = DATE_TRUNC('month', CURRENT_DATE)
              THEN COALESCE(total_amount, 0)
              ELSE 0
            END
          ),
          0
        )::NUMERIC(10,3) AS monthly_earnings,
        COALESCE(SUM(COALESCE(total_amount, 0)), 0)::NUMERIC(10,3) AS lifetime_earnings
      FROM orders
      WHERE assigned_driver_id = $1
        AND status = 'delivered';
    `,
    [driverId]
  );

  return (
    result.rows[0] || {
      completed_orders: 0,
      today_earnings: 0,
      weekly_earnings: 0,
      monthly_earnings: 0,
      lifetime_earnings: 0
    }
  );
}

async function getDriverNotifications(driverId) {
  const result = await db.query(
    `
      SELECT
        o.id,
        o.status,
        o.driver_stage,
        o.current_candidate_driver_id,
        o.name,
        o.gas_type,
        o.quantity,
        COALESCE(o.address_full, o.address_text, o.location) AS address_full,
        o.updated_at,
        o.created_at,
        CASE
          WHEN o.status = 'pending' AND o.current_candidate_driver_id = $1 THEN 'driver_notified'
          WHEN o.status = 'accepted' AND o.driver_stage = 'accepted' THEN 'accepted'
          WHEN o.status = 'accepted' AND o.driver_stage = 'on_the_way' THEN 'on_the_way'
          WHEN o.status = 'accepted' AND o.driver_stage = 'arrived' THEN 'arrived'
          WHEN o.status = 'delivered' THEN 'delivered'
          WHEN o.status = 'cancelled' THEN 'cancelled'
          ELSE 'order_update'
        END AS notification_type
      FROM orders o
      WHERE (
          (
            o.status = 'pending'
            AND o.current_candidate_driver_id = $1
            AND o.driver_stage = 'driver_notified'
            AND (o.dispatch_expires_at IS NULL OR o.dispatch_expires_at > NOW())
          )
          OR o.assigned_driver_id = $1
        )
      ORDER BY COALESCE(o.updated_at, o.created_at) DESC, o.created_at DESC
      LIMIT 20;
    `,
    [driverId]
  );

  return result.rows;
}

async function markOrderRejectedByDriver(orderId, driverId, reason = null) {
  const result = await db.query(
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
        rejected_at = NOW()
      RETURNING *;
    `,
    [driverId, orderId, reason]
  );

  return result.rows[0] || null;
}

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  resetOrders,
  getDriverOrderById,
  updateOrder,
  getDriverAvailableOrders,
  getDriverActiveOrders,
  getDriverOrderHistory,
  getDriverEarningsSummary,
  getDriverNotifications,
  markOrderRejectedByDriver
};


