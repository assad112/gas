const db = require("../config/db");

function toCustomerProfile(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    fullName: row.full_name,
    phone: row.phone,
    email: row.email || "",
    defaultAddressId: row.default_address_id || "addr-001",
    avatarUrl: row.avatar_url || null
  };
}

async function createCustomer({
  fullName,
  phone,
  email,
  passwordHash,
  sessionToken,
  defaultAddressId = "addr-001"
}) {
  const result = await db.query(
    `
      INSERT INTO customers (
        full_name,
        phone,
        email,
        password_hash,
        session_token,
        default_address_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `,
    [
      fullName,
      phone,
      email || null,
      passwordHash,
      sessionToken,
      defaultAddressId
    ]
  );

  return toCustomerProfile(result.rows[0]);
}

async function findCustomerAuthByIdentifier(identifier) {
  const result = await db.query(
    `
      SELECT *
      FROM customers
      WHERE phone = $1
         OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
            = REGEXP_REPLACE($1, '[^0-9]', '', 'g')
         OR LOWER(COALESCE(email, '')) = LOWER($1)
      LIMIT 1;
    `,
    [identifier]
  );

  return result.rows[0] || null;
}

async function findCustomerBySessionToken(sessionToken) {
  const result = await db.query(
    `
      SELECT *
      FROM customers
      WHERE session_token = $1
      LIMIT 1;
    `,
    [sessionToken]
  );

  return result.rows[0] || null;
}

async function findCustomerById(customerId) {
  const result = await db.query(
    `
      SELECT *
      FROM customers
      WHERE id = $1
      LIMIT 1;
    `,
    [customerId]
  );

  return toCustomerProfile(result.rows[0] || null);
}

async function updateSessionToken(customerId, sessionToken) {
  const result = await db.query(
    `
      UPDATE customers
      SET session_token = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `,
    [customerId, sessionToken]
  );

  return toCustomerProfile(result.rows[0] || null);
}

async function clearSessionToken(customerId) {
  await db.query(
    `
      UPDATE customers
      SET session_token = NULL,
          updated_at = NOW()
      WHERE id = $1;
    `,
    [customerId]
  );
}

async function updateCustomerPassword(customerId, passwordHash) {
  const result = await db.query(
    `
      UPDATE customers
      SET password_hash = $2,
          session_token = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `,
    [customerId, passwordHash]
  );

  return toCustomerProfile(result.rows[0] || null);
}

async function deleteCustomer(customerId) {
  const result = await db.query(
    `
      DELETE FROM customers
      WHERE id = $1
      RETURNING *;
    `,
    [customerId]
  );

  return toCustomerProfile(result.rows[0] || null);
}

async function getAllCustomersForAdmin({ search } = {}) {
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${search}%`);
    const placeholder = `$${params.length}`;
    conditions.push(`
      (
        c.full_name ILIKE ${placeholder}
        OR c.phone ILIKE ${placeholder}
        OR COALESCE(c.email, '') ILIKE ${placeholder}
        OR CAST(c.id AS TEXT) ILIKE ${placeholder}
      )
    `);
  }

  const result = await db.query(
    `
      SELECT
        c.id,
        c.full_name,
        c.phone,
        c.email,
        c.created_at,
        COUNT(o.id)::INTEGER AS orders_count,
        MAX(o.created_at) AS last_order_at
      FROM customers c
      LEFT JOIN orders o
        ON o.customer_id = c.id
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      GROUP BY c.id
      ORDER BY MAX(o.created_at) DESC NULLS LAST, c.created_at DESC, c.id DESC;
    `,
    params
  );

  return result.rows;
}

module.exports = {
  toCustomerProfile,
  createCustomer,
  findCustomerAuthByIdentifier,
  findCustomerBySessionToken,
  findCustomerById,
  updateSessionToken,
  clearSessionToken,
  updateCustomerPassword,
  deleteCustomer,
  getAllCustomersForAdmin
};
