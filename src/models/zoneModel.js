const db = require("../config/db");
const {
  computeCentroid,
  parsePolygonInput,
  polygonToGeoJson,
  toFiniteNumber
} = require("../utils/geometry");

function serializeZone(row) {
  if (!row) {
    return null;
  }

  const polygon = parsePolygonInput(row.polygon);
  const centerLatitude = toFiniteNumber(
    row.center_latitude ?? row.centerLatitude
  );
  const centerLongitude = toFiniteNumber(
    row.center_longitude ?? row.centerLongitude
  );
  const computedCenter = polygon ? computeCentroid(polygon) : null;

  return {
    ...row,
    polygon,
    polygon_geojson: polygon ? polygonToGeoJson(polygon) : null,
    center_latitude: centerLatitude ?? computedCenter?.latitude ?? null,
    center_longitude: centerLongitude ?? computedCenter?.longitude ?? null
  };
}

async function getAllZones() {
  const result = await db.query(
    `
      SELECT *
      FROM delivery_zones
      ORDER BY created_at ASC, id ASC;
    `
  );

  return result.rows.map(serializeZone);
}

async function getZoneById(id) {
  const result = await db.query(
    `
      SELECT *
      FROM delivery_zones
      WHERE id = $1
      LIMIT 1;
    `,
    [id]
  );

  return serializeZone(result.rows[0] || null);
}

async function updateZone(id, changes = {}) {
  const values = [id];
  const updates = [];

  const fieldMap = {
    nameAr: "name_ar",
    nameEn: "name_en",
    governorate: "governorate",
    deliveryFee: "delivery_fee",
    estimatedDeliveryMinutes: "estimated_delivery_minutes",
    isActive: "is_active",
    polygon: "polygon",
    centerLatitude: "center_latitude",
    centerLongitude: "center_longitude",
    operationalNotes: "operational_notes"
  };

  Object.entries(fieldMap).forEach(([inputKey, columnName]) => {
    if (!(inputKey in changes)) {
      return;
    }

    values.push(
      inputKey === "polygon"
        ? JSON.stringify(parsePolygonInput(changes[inputKey]))
        : changes[inputKey]
    );
    updates.push(`${columnName} = $${values.length}`);
  });

  if (!updates.length) {
    return getZoneById(id);
  }

  updates.push("updated_at = NOW()");

  const result = await db.query(
    `
      UPDATE delivery_zones
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING *;
    `,
    values
  );

  return serializeZone(result.rows[0] || null);
}

async function deleteZone(id) {
  const result = await db.query(
    `
      DELETE FROM delivery_zones
      WHERE id = $1
      RETURNING *;
    `,
    [id]
  );

  return serializeZone(result.rows[0] || null);
}

module.exports = {
  getAllZones,
  getZoneById,
  updateZone,
  deleteZone
};
