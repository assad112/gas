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
  if (status === "pending") {
    return "new_order";
  }

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
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'new_order', NOW()
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
            AND (
              o.assigned_driver_id IS NULL
              OR o.assigned_driver_id = $2
            )
            AND NOT EXISTS (
              SELECT 1
              FROM driver_order_rejections dor
              WHERE dor.order_id = o.id
                AND dor.driver_id = $2
            )
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
  const values = [id];
  const updates = [];

  if ("status" in changes) {
    values.push(changes.status);
    updates.push(`status = $${values.length}`);

    if (changes.status === "cancelled") {
      updates.push(`cancelled_at = NOW()`);
    } else if (changes.status === "delivered") {
      updates.push(`cancelled_at = NULL`);
      updates.push(`delivered_at = NOW()`);
    } else {
      updates.push(`cancelled_at = NULL`);
    }
  }

  if ("driverStage" in changes) {
    values.push(changes.driverStage);
    updates.push(`driver_stage = $${values.length}`);

    if (changes.driverStage === "accepted") {
      updates.push(`accepted_at = COALESCE(accepted_at, NOW())`);
    }

    if (changes.driverStage === "delivered") {
      updates.push(`delivered_at = NOW()`);
    }

    if (changes.driverStage === "cancelled") {
      updates.push(`cancelled_at = NOW()`);
    }
  } else if ("status" in changes) {
    const inferredStage = resolveDriverStageFromStatus(changes.status);

    if (inferredStage) {
      values.push(inferredStage);
      updates.push(`driver_stage = $${values.length}`);
    }

    if (changes.status === "accepted") {
      updates.push(`accepted_at = COALESCE(accepted_at, NOW())`);
    }
  }

  if ("assignedDriverId" in changes) {
    values.push(changes.assignedDriverId);
    updates.push(`assigned_driver_id = $${values.length}`);
  }

  if ("paymentMethod" in changes) {
    values.push(changes.paymentMethod);
    updates.push(`payment_method = $${values.length}`);
  }

  if ("location" in changes) {
    values.push(changes.location);
    updates.push(`location = $${values.length}`);
  }

  if ("addressText" in changes) {
    values.push(changes.addressText);
    updates.push(`address_text = $${values.length}`);
  }

  if ("addressFull" in changes) {
    values.push(changes.addressFull);
    updates.push(`address_full = $${values.length}`);
  }

  if ("quantity" in changes) {
    values.push(changes.quantity);
    updates.push(`quantity = $${values.length}`);
  }

  if ("notes" in changes) {
    values.push(changes.notes);
    updates.push(`notes = $${values.length}`);
  }

  if ("preferredDeliveryWindow" in changes) {
    values.push(changes.preferredDeliveryWindow);
    updates.push(`preferred_delivery_window = $${values.length}`);
  }

  if ("totalAmount" in changes) {
    values.push(changes.totalAmount);
    updates.push(`total_amount = $${values.length}`);
  }

  if ("customerLatitude" in changes) {
    values.push(changes.customerLatitude);
    updates.push(`customer_latitude = $${values.length}`);
  }

  if ("customerLongitude" in changes) {
    values.push(changes.customerLongitude);
    updates.push(`customer_longitude = $${values.length}`);
  }

  if ("latitude" in changes) {
    values.push(changes.latitude);
    updates.push(`latitude = $${values.length}`);
  }

  if ("longitude" in changes) {
    values.push(changes.longitude);
    updates.push(`longitude = $${values.length}`);
  }

  if (updates.length === 0) {
    return getOrderById(id);
  }

  updates.push(`updated_at = NOW()`);

  const result = await db.query(
    `
      UPDATE orders
      SET ${updates.join(", ")}
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
    "o.assigned_driver_id IS NULL",
    `NOT EXISTS (
      SELECT 1
      FROM driver_order_rejections dor
      WHERE dor.order_id = o.id
        AND dor.driver_id = $1
    )`
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
        o.name,
        o.gas_type,
        o.quantity,
        COALESCE(o.address_full, o.address_text, o.location) AS address_full,
        o.updated_at,
        o.created_at,
        CASE
          WHEN o.status = 'pending' AND o.assigned_driver_id IS NULL THEN 'new_order'
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
            AND o.assigned_driver_id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM driver_order_rejections dor
              WHERE dor.order_id = o.id
                AND dor.driver_id = $1
            )
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


