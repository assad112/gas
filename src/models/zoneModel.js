const db = require("../config/db");

async function getAllZones() {
  const result = await db.query(
    `
      SELECT *
      FROM delivery_zones
      ORDER BY created_at ASC, id ASC;
    `
  );

  return result.rows;
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

  return result.rows[0] || null;
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
    operationalNotes: "operational_notes"
  };

  Object.entries(fieldMap).forEach(([inputKey, columnName]) => {
    if (!(inputKey in changes)) {
      return;
    }

    values.push(changes[inputKey]);
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

  return result.rows[0] || null;
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

  return result.rows[0] || null;
}

module.exports = {
  getAllZones,
  getZoneById,
  updateZone,
  deleteZone
};
