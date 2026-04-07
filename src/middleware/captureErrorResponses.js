const {
  buildRequestLogEntry,
  recordErrorLog
} = require("../services/errorLogService");

function captureErrorResponses(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function patchedJson(body) {
    const statusCode = res.statusCode || 200;

    if (statusCode >= 400 && !res.locals.errorLogged) {
      res.locals.errorLogged = true;
      recordErrorLog(
        buildRequestLogEntry(req, {
          level: statusCode >= 500 ? "error" : "warn",
          errorName: statusCode >= 500 ? "HttpError" : "HttpWarning",
          message:
            body?.message ||
            `HTTP ${statusCode} on ${req.method} ${req.originalUrl || req.url}`,
          statusCode,
          metadata: {
            responseBody: body
          }
        })
      ).catch(() => {});
    }

    return originalJson(body);
  };

  next();
}

module.exports = captureErrorResponses;
