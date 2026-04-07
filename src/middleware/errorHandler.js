const {
  buildRequestLogEntry,
  recordErrorLog
} = require("../services/errorLogService");

function errorHandler(error, req, res, _next) {
  console.error(error);

  if (res.headersSent) {
    return;
  }

  res.locals.errorLogged = true;

  recordErrorLog(
    buildRequestLogEntry(req, {
      level: (error.statusCode || 500) >= 500 ? "error" : "warn",
      errorName: error.name || "Error",
      message: error.message || "Internal server error",
      stackTrace: error.stack || null,
      statusCode: error.statusCode || 500,
      metadata: {
        code: error.code || null
      }
    })
  ).catch(() => {});

  res.status(error.statusCode || 500).json({
    message: error.message || "Internal server error"
  });
}

module.exports = errorHandler;
