const db = require("../config/db");

async function getAllProducts() {
  const result = await db.query(
    `
      SELECT *
      FROM gas_products
      ORDER BY created_at ASC, id ASC;
    `
  );

  return result.rows;
}

async function getProductById(id) {
  const result = await db.query(
    `
      SELECT *
      FROM gas_products
      WHERE id = $1
      LIMIT 1;
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function updateProduct(id, changes = {}) {
  const values = [id];
  const updates = [];

  const fieldMap = {
    nameAr: "name_ar",
    nameEn: "name_en",
    sizeLabel: "size_label",
    price: "price",
    deliveryFee: "delivery_fee",
    isAvailable: "is_available",
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
    return getProductById(id);
  }

  updates.push("updated_at = NOW()");

  const result = await db.query(
    `
      UPDATE gas_products
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING *;
    `,
    values
  );

  return result.rows[0] || null;
}

module.exports = {
  getAllProducts,
  getProductById,
  updateProduct
};
