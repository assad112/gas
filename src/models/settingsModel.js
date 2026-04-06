const db = require("../config/db");

async function getSettings() {
  const result = await db.query(
    `
      SELECT *
      FROM system_settings
      WHERE id = 1
      LIMIT 1;
    `
  );

  return result.rows[0] || null;
}

async function updateSettings(changes = {}) {
  const values = [1];
  const updates = [];

  const fieldMap = {
    systemName: "system_name",
    supportPhone: "support_phone",
    defaultLanguage: "default_language",
    currencyCode: "currency_code",
    maintenanceMode: "maintenance_mode",
    notificationsEnabled: "notifications_enabled",
    autoAssignDrivers: "auto_assign_drivers",
    orderIntakeEnabled: "order_intake_enabled",
    defaultDeliveryFee: "default_delivery_fee",
    systemMessage: "system_message"
  };

  Object.entries(fieldMap).forEach(([inputKey, columnName]) => {
    if (!(inputKey in changes)) {
      return;
    }

    values.push(changes[inputKey]);
    updates.push(`${columnName} = $${values.length}`);
  });

  if (!updates.length) {
    return getSettings();
  }

  updates.push("updated_at = NOW()");

  const result = await db.query(
    `
      UPDATE system_settings
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING *;
    `,
    values
  );

  return result.rows[0] || null;
}

module.exports = {
  getSettings,
  updateSettings
};
