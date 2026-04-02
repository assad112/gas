const driverModel = require("../models/driverModel");

function readBearerToken(req) {
  const authorizationHeader = req.headers.authorization;

  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

async function attachDriverIfPresent(req, _res, next) {
  try {
    const token = readBearerToken(req);

    if (!token) {
      return next();
    }

    const driver = await driverModel.findDriverBySessionToken(token);

    if (driver) {
      req.driver = driverModel.toDriverProfile(driver);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireDriverAuth(req, res, next) {
  try {
    const token = readBearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Driver authentication token is required."
      });
    }

    const driver = await driverModel.findDriverBySessionToken(token);

    if (!driver) {
      return res.status(401).json({
        message: "Invalid or expired driver authentication token."
      });
    }

    req.driver = driverModel.toDriverProfile(driver);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  attachDriverIfPresent,
  requireDriverAuth
};
