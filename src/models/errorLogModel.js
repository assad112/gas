const db = require("../config/db");

async function createErrorLog({
  level,
  source,
  appSource,
  clientChannel = null,
  clientPlatform = null,
  clientVersion = null,
  errorName,
  message,
  stackTrace = null,
  statusCode = null,
  requestId = null,
  method = null,
  path = null,
  ipAddress = null,
  userAgent = null,
  metadata = null
}) {
  const result = await db.query(
    `
      INSERT INTO error_logs (
        level,
        source,
        app_source,
        client_channel,
        client_platform,
        client_version,
        error_name,
        message,
        stack_trace,
        status_code,
        request_id,
        method,
        path,
        ip_address,
        user_agent,
        metadata,
        created_at
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
        $12,
        $13,
        $14,
        $15,
        $16::jsonb,
        NOW()
      )
      RETURNING *;
    `,
    [
      level,
      source,
      appSource,
      clientChannel,
      clientPlatform,
      clientVersion,
      errorName,
      message,
      stackTrace,
      statusCode,
      requestId,
      method,
      path,
      ipAddress,
      userAgent,
      JSON.stringify(metadata ?? null)
    ]
  );

  return result.rows[0] || null;
}

async function listErrorLogs({
  search = null,
  level = null,
  source = null,
  appSource = null,
  limit = 50,
  offset = 0
} = {}) {
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${search}%`);
    const placeholder = `$${params.length}`;
    conditions.push(
      `(
        message ILIKE ${placeholder}
        OR COALESCE(path, '') ILIKE ${placeholder}
        OR COALESCE(method, '') ILIKE ${placeholder}
        OR COALESCE(error_name, '') ILIKE ${placeholder}
        OR COALESCE(request_id, '') ILIKE ${placeholder}
        OR COALESCE(app_source, '') ILIKE ${placeholder}
        OR COALESCE(client_channel, '') ILIKE ${placeholder}
      )`
    );
  }

  if (level) {
    params.push(level);
    conditions.push(`level = $${params.length}`);
  }

  if (source) {
    params.push(source);
    conditions.push(`source = $${params.length}`);
  }

  if (appSource) {
    params.push(appSource);
    conditions.push(`app_source = $${params.length}`);
  }

  params.push(limit);
  params.push(offset);

  const result = await db.query(
    `
      SELECT *
      FROM error_logs
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length};
    `,
    params
  );

  return result.rows;
}

async function getErrorLogById(id) {
  const result = await db.query(
    `
      SELECT *
      FROM error_logs
      WHERE id = $1
      LIMIT 1;
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function getErrorLogSummary() {
  const result = await db.query(
    `
      SELECT
        COUNT(*)::INTEGER AS total_logs,
        COUNT(*) FILTER (
          WHERE created_at >= NOW() - INTERVAL '24 hours'
        )::INTEGER AS last_24h,
        COUNT(*) FILTER (WHERE level = 'error')::INTEGER AS error_count,
        COUNT(*) FILTER (WHERE level = 'warn')::INTEGER AS warn_count,
        COUNT(*) FILTER (WHERE source = 'http')::INTEGER AS http_count,
        COUNT(*) FILTER (WHERE source = 'process')::INTEGER AS process_count,
        COUNT(*) FILTER (WHERE app_source = 'customer_app')::INTEGER AS customer_app_count,
        COUNT(*) FILTER (WHERE app_source = 'driver_app')::INTEGER AS driver_app_count,
        MAX(created_at) AS latest_at
      FROM error_logs;
    `
  );

  return (
    result.rows[0] || {
      total_logs: 0,
      last_24h: 0,
      error_count: 0,
      warn_count: 0,
      http_count: 0,
      process_count: 0,
      customer_app_count: 0,
      driver_app_count: 0,
      latest_at: null
    }
  );
}

module.exports = {
  createErrorLog,
  listErrorLogs,
  getErrorLogById,
  getErrorLogSummary
};
