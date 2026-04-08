const fs = require("fs/promises");
const path = require("path");

const errorLogModel = require("../models/errorLogModel");

const logsDirectory = path.resolve(__dirname, "..", "..", "logs");
const logFilePath = path.join(logsDirectory, "errors.log");

function toNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : null;
}

function toNullableInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(String(value), 10);
  return Number.isInteger(parsedValue) ? parsedValue : null;
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(metadata));
  } catch {
    return {
      note: "Metadata serialization failed."
    };
  }
}

function normalizeAppSource(value) {
  const normalizedValue = toNullableString(value)
    ?.toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_");

  return normalizedValue || "backend";
}

function normalizeClientChannel(value) {
  return (
    toNullableString(value)
      ?.toLowerCase()
      .replace(/[^a-z0-9._/-]+/g, "_") || null
  );
}

function buildClientContextFromHeaders(headers = {}) {
  return {
    appSource: normalizeAppSource(headers["x-client-app"]),
    clientChannel:
      normalizeClientChannel(headers["x-client-channel"]) || "api",
    clientPlatform: toNullableString(headers["x-client-platform"]),
    clientVersion: toNullableString(headers["x-client-version"])
  };
}

function buildClientContextFromRequest(req) {
  return buildClientContextFromHeaders(req.headers || {});
}

function normalizeErrorEntry(entry = {}) {
  const level = ["error", "warn", "info"].includes(entry.level)
    ? entry.level
    : "error";
  const source = ["http", "process", "startup", "manual", "client", "socket"].includes(
    entry.source
  )
    ? entry.source
    : "http";

  return {
    level,
    source,
    appSource: normalizeAppSource(entry.appSource),
    clientChannel: normalizeClientChannel(entry.clientChannel),
    clientPlatform: toNullableString(entry.clientPlatform),
    clientVersion: toNullableString(entry.clientVersion),
    errorName: toNullableString(entry.errorName) || "Error",
    message: toNullableString(entry.message) || "Unknown error",
    stackTrace: toNullableString(entry.stackTrace),
    statusCode: toNullableInteger(entry.statusCode),
    requestId: toNullableString(entry.requestId),
    method: toNullableString(entry.method),
    path: toNullableString(entry.path),
    ipAddress: toNullableString(entry.ipAddress),
    userAgent: toNullableString(entry.userAgent),
    metadata: normalizeMetadata(entry.metadata),
    createdAt: new Date().toISOString()
  };
}

async function appendToErrorFile(entry) {
  await fs.mkdir(logsDirectory, { recursive: true });
  await fs.appendFile(logFilePath, `${JSON.stringify(entry)}\n`, "utf8");
}

async function recordErrorLog(entry = {}) {
  const normalizedEntry = normalizeErrorEntry(entry);

  await appendToErrorFile(normalizedEntry).catch((error) => {
    console.error("Failed to append to errors.log:", error);
  });

  const persistedLog = await errorLogModel
    .createErrorLog(normalizedEntry)
    .catch((error) => {
      console.error("Failed to persist error log in database:", error);
      return null;
    });

  return {
    ...normalizedEntry,
    id: persistedLog?.id || null,
    createdAt: persistedLog?.created_at || normalizedEntry.createdAt
  };
}

function buildRequestId(req) {
  return (
    toNullableString(req.headers["x-request-id"]) ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
}

function buildRequestLogEntry(
  req,
  {
    level = "error",
    message,
    errorName = "HttpError",
    stackTrace = null,
    statusCode = null,
    metadata = null
  } = {}
) {
  const clientContext = buildClientContextFromRequest(req);

  return {
    level,
    source: "http",
    ...clientContext,
    errorName,
    message,
    stackTrace,
    statusCode,
    requestId: buildRequestId(req),
    method: req.method,
    path: req.originalUrl || req.url,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] || null,
    metadata
  };
}

function buildClientReportLogEntry(req, payload = {}) {
  const clientContext = buildClientContextFromRequest(req);
  const requestedSource = toNullableString(payload.source)?.toLowerCase();

  return {
    level: ["error", "warn", "info"].includes(payload.level)
      ? payload.level
      : "error",
    source:
      requestedSource === "socket"
        ? "socket"
        : requestedSource === "manual"
          ? "manual"
          : "client",
    appSource: normalizeAppSource(payload.appSource || clientContext.appSource),
    clientChannel:
      normalizeClientChannel(payload.clientChannel || clientContext.clientChannel) ||
      "runtime",
    clientPlatform: toNullableString(payload.clientPlatform || clientContext.clientPlatform),
    clientVersion: toNullableString(payload.clientVersion || clientContext.clientVersion),
    errorName: toNullableString(payload.errorName) || "ClientError",
    message: toNullableString(payload.message) || "Client-side error",
    stackTrace: toNullableString(payload.stackTrace),
    statusCode: toNullableInteger(payload.statusCode),
    requestId: toNullableString(payload.requestId) || buildRequestId(req),
    method: toNullableString(payload.method),
    path: toNullableString(payload.path),
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] || null,
    metadata: {
      ...(normalizeMetadata(payload.metadata) || {}),
      reportedFrom: "client_app"
    }
  };
}

async function listErrorLogs(filters = {}) {
  return errorLogModel.listErrorLogs(filters);
}

async function getErrorLogById(id) {
  return errorLogModel.getErrorLogById(id);
}

async function getErrorLogSummary() {
  const summary = await errorLogModel.getErrorLogSummary();

  return {
    totalLogs: Number(summary.total_logs || 0),
    last24h: Number(summary.last_24h || 0),
    errorCount: Number(summary.error_count || 0),
    warnCount: Number(summary.warn_count || 0),
    httpCount: Number(summary.http_count || 0),
    processCount: Number(summary.process_count || 0),
    customerAppCount: Number(summary.customer_app_count || 0),
    driverAppCount: Number(summary.driver_app_count || 0),
    latestAt: summary.latest_at || null,
    filePath: logFilePath
  };
}

module.exports = {
  logFilePath,
  recordErrorLog,
  buildClientContextFromRequest,
  buildClientReportLogEntry,
  buildRequestLogEntry,
  listErrorLogs,
  getErrorLogById,
  getErrorLogSummary
};
