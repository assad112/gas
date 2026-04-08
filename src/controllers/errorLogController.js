const {
  listErrorLogs,
  getErrorLogById,
  getErrorLogSummary,
  buildClientReportLogEntry,
  recordErrorLog
} = require("../services/errorLogService");

function toPositiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallbackValue;
}

function serializeErrorLog(log) {
  if (!log) {
    return null;
  }

  return {
    id: Number(log.id),
    level: log.level,
    source: log.source,
    appSource: log.app_source,
    clientChannel: log.client_channel,
    clientPlatform: log.client_platform,
    clientVersion: log.client_version,
    errorName: log.error_name,
    message: log.message,
    stackTrace: log.stack_trace,
    statusCode: log.status_code,
    requestId: log.request_id,
    method: log.method,
    path: log.path,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    metadata: log.metadata,
    createdAt: log.created_at
  };
}

async function getErrorLogs(req, res, next) {
  try {
    const logs = await listErrorLogs({
      search: String(req.query.search || "").trim() || null,
      level: String(req.query.level || "").trim() || null,
      source: String(req.query.source || "").trim() || null,
      appSource: String(req.query.appSource || "").trim() || null,
      limit: toPositiveInteger(req.query.limit, 50),
      offset: toPositiveInteger(req.query.offset, 0)
    });
    const summary = await getErrorLogSummary();

    return res.status(200).json({
      logs: logs.map(serializeErrorLog),
      summary
    });
  } catch (error) {
    return next(error);
  }
}

async function getErrorLogDetails(req, res, next) {
  try {
    const logId = toPositiveInteger(req.params.id, null);

    if (!logId) {
      return res.status(400).json({
        message: "Invalid error log id."
      });
    }

    const log = await getErrorLogById(logId);

    if (!log) {
      return res.status(404).json({
        message: "Error log not found."
      });
    }

    return res.status(200).json(serializeErrorLog(log));
  } catch (error) {
    return next(error);
  }
}

async function createClientErrorLog(req, res, next) {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({
        message: "Client error message is required."
      });
    }

    const createdLog = await recordErrorLog(buildClientReportLogEntry(req, req.body));

    return res.status(201).json({
      log: createdLog
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getErrorLogs,
  getErrorLogDetails,
  createClientErrorLog
};
