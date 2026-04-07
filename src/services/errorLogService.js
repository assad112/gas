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

function normalizeErrorEntry(entry = {}) {
  const level = ["error", "warn", "info"].includes(entry.level)
    ? entry.level
    : "error";
  const source = ["http", "process", "startup", "manual"].includes(entry.source)
    ? entry.source
    : "http";

  return {
    level,
    source,
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

function buildRequestLogEntry(req, {
  level = "error",
  message,
  errorName = "HttpError",
  stackTrace = null,
  statusCode = null,
  metadata = null
} = {}) {
  return {
    level,
    source: "http",
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
    latestAt: summary.latest_at || null,
    filePath: logFilePath
  };
}

module.exports = {
  logFilePath,
  recordErrorLog,
  buildRequestLogEntry,
  listErrorLogs,
  getErrorLogById,
  getErrorLogSummary
};
