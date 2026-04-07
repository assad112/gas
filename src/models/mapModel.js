const db = require("../config/db");

function toJson(value) {
  return value === undefined ? null : JSON.stringify(value ?? null);
}

async function logDriverLocationHistory({
  driverId,
  orderId = null,
  latitude,
  longitude,
  accuracy = null,
  speed = null,
  heading = null,
  source = "driver_app"
}) {
  const result = await db.query(
    `
      INSERT INTO driver_location_history (
        driver_id,
        order_id,
        latitude,
        longitude,
        accuracy_meters,
        speed_mps,
        heading_degrees,
        source,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *;
    `,
    [driverId, orderId, latitude, longitude, accuracy, speed, heading, source]
  );

  return result.rows[0] || null;
}

async function getDriverLocationTrail({
  driverId = null,
  orderId = null,
  limit = 120
} = {}) {
  const conditions = [];
  const params = [];

  if (driverId) {
    params.push(driverId);
    conditions.push(`driver_id = $${params.length}`);
  }

  if (orderId) {
    params.push(orderId);
    conditions.push(`order_id = $${params.length}`);
  }

  params.push(limit);

  const result = await db.query(
    `
      SELECT *
      FROM driver_location_history
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY created_at DESC
      LIMIT $${params.length};
    `,
    params
  );

  return result.rows.reverse();
}

async function upsertMapAlert({
  entityType,
  entityId,
  alertType,
  severity = "medium",
  title,
  message,
  metadata = null
}) {
  const result = await db.query(
    `
      INSERT INTO map_alerts (
        entity_type,
        entity_id,
        alert_type,
        severity,
        title,
        message,
        metadata,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'open', NOW(), NOW())
      ON CONFLICT (entity_type, entity_id, alert_type, status)
      DO UPDATE SET
        severity = EXCLUDED.severity,
        title = EXCLUDED.title,
        message = EXCLUDED.message,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *;
    `,
    [
      entityType,
      String(entityId),
      alertType,
      severity,
      title,
      message,
      toJson(metadata)
    ]
  );

  return result.rows[0] || null;
}

async function resolveMapAlert({ entityType, entityId, alertType }) {
  await db.query(
    `
      UPDATE map_alerts
      SET status = 'resolved',
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE entity_type = $1
        AND entity_id = $2
        AND alert_type = $3
        AND status = 'open';
    `,
    [entityType, String(entityId), alertType]
  );
}

async function getRecentMapAlerts({ limit = 30 } = {}) {
  const result = await db.query(
    `
      SELECT *
      FROM map_alerts
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT $1;
    `,
    [limit]
  );

  return result.rows;
}

module.exports = {
  logDriverLocationHistory,
  getDriverLocationTrail,
  upsertMapAlert,
  resolveMapAlert,
  getRecentMapAlerts
};
