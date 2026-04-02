const db = require("../config/db");

const driverWithActiveOrderSelect = `
  SELECT
    d.id,
    d.name,
    d.username,
    d.phone,
    d.email,
    d.status,
    d.availability,
    d.current_location,
    d.current_latitude,
    d.current_longitude,
    d.last_location_at,
    d.vehicle_label,
    d.license_number,
    d.last_seen_at,
    d.created_at,
    d.updated_at,
    active_order.id AS current_order_id,
    active_order.status AS current_order_status,
    active_order.driver_stage AS current_order_stage,
    COALESCE(active_order.address_full, active_order.location) AS current_order_location
  FROM drivers d
  LEFT JOIN LATERAL (
    SELECT
      o.id,
      o.status,
      o.driver_stage,
      o.location,
      o.address_full
    FROM orders o
    WHERE o.assigned_driver_id = d.id
      AND o.status NOT IN ('delivered', 'cancelled')
    ORDER BY COALESCE(o.updated_at, o.created_at) DESC, o.created_at DESC
    LIMIT 1
  ) AS active_order
    ON TRUE
`;

function toDriverProfile(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    name: row.name,
    username: row.username || "",
    phone: row.phone,
    email: row.email || "",
    status: row.status || "offline",
    availability: row.availability || "available",
    currentLocation: row.current_location || "",
    currentLatitude:
      row.current_latitude === null || row.current_latitude === undefined
        ? null
        : Number(row.current_latitude),
    currentLongitude:
      row.current_longitude === null || row.current_longitude === undefined
        ? null
        : Number(row.current_longitude),
    vehicleLabel: row.vehicle_label || "",
    licenseNumber: row.license_number || "",
    lastSeenAt: row.last_seen_at || null,
    lastLocationAt: row.last_location_at || null
  };
}

async function getAllDrivers() {
  const result = await db.query(
    `
      ${driverWithActiveOrderSelect}
      ORDER BY d.created_at DESC, d.id DESC;
    `
  );

  return result.rows;
}

async function getDriverWithActiveOrderById(id) {
  const result = await db.query(
    `
      ${driverWithActiveOrderSelect}
      WHERE d.id = $1
      LIMIT 1;
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function getDriverById(id) {
  const result = await db.query(
    `
      SELECT *
      FROM drivers
      WHERE id = $1
      LIMIT 1;
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function createDriver({
  name,
  username,
  phone,
  email = null,
  passwordHash = null,
  status = "offline",
  availability = "available",
  currentLocation = null,
  currentLatitude = null,
  currentLongitude = null,
  vehicleLabel = null,
  licenseNumber = null,
  sessionToken = null
}) {
  const result = await db.query(
    `
      INSERT INTO drivers (
        name,
        username,
        phone,
        email,
        password_hash,
        session_token,
        status,
        availability,
        current_location,
        current_latitude,
        current_longitude,
        last_location_at,
        vehicle_label,
        license_number,
        last_seen_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        CASE
          WHEN $10::DOUBLE PRECISION IS NOT NULL
            AND $11::DOUBLE PRECISION IS NOT NULL
          THEN NOW()
          ELSE NULL
        END,
        $12,
        $13,
        CASE WHEN $7::TEXT = 'online' THEN NOW() ELSE NULL END,
        NOW()
      )
      RETURNING id;
    `,
    [
      name,
      username,
      phone,
      email,
      passwordHash,
      sessionToken,
      status,
      availability,
      currentLocation,
      currentLatitude,
      currentLongitude,
      vehicleLabel,
      licenseNumber
    ]
  );

  return getDriverWithActiveOrderById(result.rows[0]?.id);
}

async function updateDriver(id, changes = {}) {
  const values = [id];
  const updates = [];
  let statusParamIndex = null;
  let latitudeParamIndex = null;
  let longitudeParamIndex = null;

  const fieldMap = {
    name: "name",
    username: "username",
    phone: "phone",
    email: "email",
    passwordHash: "password_hash",
    sessionToken: "session_token",
    status: "status",
    availability: "availability",
    currentLocation: "current_location",
    currentLatitude: "current_latitude",
    currentLongitude: "current_longitude",
    vehicleLabel: "vehicle_label",
    licenseNumber: "license_number",
    fcmToken: "fcm_token"
  };

  Object.entries(fieldMap).forEach(([inputKey, columnName]) => {
    if (!(inputKey in changes)) {
      return;
    }

    values.push(changes[inputKey]);
    updates.push(`${columnName} = $${values.length}`);

    if (inputKey === "status") {
      statusParamIndex = values.length;
    }

    if (inputKey === "currentLatitude") {
      latitudeParamIndex = values.length;
    }

    if (inputKey === "currentLongitude") {
      longitudeParamIndex = values.length;
    }
  });

  if (statusParamIndex !== null) {
    updates.push(
      `last_seen_at = CASE
        WHEN $${statusParamIndex}::TEXT = 'online' THEN NOW()
        ELSE last_seen_at
      END`
    );
  }

  if (latitudeParamIndex !== null && longitudeParamIndex !== null) {
    updates.push(
      `last_location_at = CASE
        WHEN $${latitudeParamIndex}::DOUBLE PRECISION IS NOT NULL
          AND $${longitudeParamIndex}::DOUBLE PRECISION IS NOT NULL
        THEN NOW()
        ELSE last_location_at
      END`
    );
  }

  if (!updates.length) {
    return getDriverWithActiveOrderById(id);
  }

  updates.push("updated_at = NOW()");

  const result = await db.query(
    `
      UPDATE drivers
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING id;
    `,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return getDriverWithActiveOrderById(id);
}

async function updateDriverAvailability(id, availability) {
  const result = await db.query(
    `
      UPDATE drivers
      SET availability = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `,
    [id, availability]
  );

  return result.rows[0] || null;
}

async function updateDriverOperationalState(
  id,
  { status, availability } = {}
) {
  return updateDriver(id, {
    ...(status !== undefined ? { status } : {}),
    ...(availability !== undefined ? { availability } : {})
  });
}

async function updateDriverLocation(
  id,
  { latitude, longitude, currentLocation } = {}
) {
  return updateDriver(id, {
    ...(latitude !== undefined ? { currentLatitude: latitude } : {}),
    ...(longitude !== undefined ? { currentLongitude: longitude } : {}),
    ...(currentLocation !== undefined ? { currentLocation } : {})
  });
}

async function findDriverAuthByIdentifier(identifier) {
  const result = await db.query(
    `
      SELECT *
      FROM drivers
      WHERE LOWER(COALESCE(username, '')) = LOWER($1)
         OR phone = $1
         OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
            = REGEXP_REPLACE($1, '[^0-9]', '', 'g')
         OR LOWER(COALESCE(email, '')) = LOWER($1)
      LIMIT 1;
    `,
    [identifier]
  );

  return result.rows[0] || null;
}

async function findDriverByUsername(username) {
  const result = await db.query(
    `
      SELECT *
      FROM drivers
      WHERE LOWER(COALESCE(username, '')) = LOWER($1)
      LIMIT 1;
    `,
    [username]
  );

  return result.rows[0] || null;
}

async function findDriverBySessionToken(sessionToken) {
  const result = await db.query(
    `
      SELECT *
      FROM drivers
      WHERE session_token = $1
      LIMIT 1;
    `,
    [sessionToken]
  );

  return result.rows[0] || null;
}

async function updateSessionToken(driverId, sessionToken) {
  const result = await db.query(
    `
      UPDATE drivers
      SET session_token = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `,
    [driverId, sessionToken]
  );

  return toDriverProfile(result.rows[0] || null);
}

async function clearSessionToken(driverId) {
  await db.query(
    `
      UPDATE drivers
      SET session_token = NULL,
          updated_at = NOW()
      WHERE id = $1;
    `,
    [driverId]
  );
}

async function updateDriverPushToken(driverId, fcmToken) {
  const result = await db.query(
    `
      UPDATE drivers
      SET fcm_token = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `,
    [driverId, fcmToken]
  );

  return result.rows[0] || null;
}

async function deleteDriver(driverId) {
  const result = await db.query(
    `
      DELETE FROM drivers
      WHERE id = $1
      RETURNING *;
    `,
    [driverId]
  );

  return result.rows[0] || null;
}

async function syncDriverAvailability(id) {
  if (!id) {
    return null;
  }

  const result = await db.query(
    `
      WITH active_orders AS (
        SELECT COUNT(*)::INTEGER AS active_count
        FROM orders
        WHERE assigned_driver_id = $1
          AND status NOT IN ('delivered', 'cancelled')
      )
      UPDATE drivers
      SET availability = CASE
            WHEN (SELECT active_count FROM active_orders) > 0 THEN 'busy'
            ELSE 'available'
          END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function getDriverDashboardSummary(driverId) {
  const result = await db.query(
    `
      WITH delivered_orders AS (
        SELECT
          COUNT(*)::INTEGER AS total_completed,
          COALESCE(SUM(COALESCE(total_amount, 0)), 0)::NUMERIC(10,3) AS lifetime_earnings,
          COALESCE(
            SUM(
              CASE
                WHEN DATE(COALESCE(delivered_at, updated_at, created_at)) = CURRENT_DATE
                THEN COALESCE(total_amount, 0)
                ELSE 0
              END
            ),
            0
          )::NUMERIC(10,3) AS today_earnings
        FROM orders
        WHERE assigned_driver_id = $1
          AND status = 'delivered'
      ),
      active_orders AS (
        SELECT COUNT(*)::INTEGER AS active_count
        FROM orders
        WHERE assigned_driver_id = $1
          AND status = 'accepted'
          AND driver_stage IN ('accepted', 'on_the_way', 'arrived')
      ),
      available_orders AS (
        SELECT COUNT(*)::INTEGER AS available_count
        FROM orders o
        WHERE o.status = 'pending'
          AND o.assigned_driver_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM driver_order_rejections dor
            WHERE dor.order_id = o.id
              AND dor.driver_id = $1
          )
      )
      SELECT
        (SELECT total_completed FROM delivered_orders) AS total_completed,
        (SELECT lifetime_earnings FROM delivered_orders) AS lifetime_earnings,
        (SELECT today_earnings FROM delivered_orders) AS today_earnings,
        (SELECT active_count FROM active_orders) AS active_deliveries,
        (SELECT available_count FROM available_orders) AS available_orders;
    `,
    [driverId]
  );

  return (
    result.rows[0] || {
      total_completed: 0,
      lifetime_earnings: 0,
      today_earnings: 0,
      active_deliveries: 0,
      available_orders: 0
    }
  );
}

module.exports = {
  toDriverProfile,
  getAllDrivers,
  getDriverWithActiveOrderById,
  getDriverById,
  createDriver,
  updateDriver,
  updateDriverAvailability,
  updateDriverOperationalState,
  updateDriverLocation,
  findDriverAuthByIdentifier,
  findDriverByUsername,
  findDriverBySessionToken,
  updateSessionToken,
  clearSessionToken,
  updateDriverPushToken,
  deleteDriver,
  syncDriverAvailability,
  getDriverDashboardSummary
};
