function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.name = "NotFoundError";
  error.statusCode = 404;
  next(error);
}

module.exports = notFound;
