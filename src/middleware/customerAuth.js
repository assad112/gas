const customerModel = require("../models/customerModel");

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

async function attachCustomerIfPresent(req, _res, next) {
  try {
    const token = readBearerToken(req);

    if (!token) {
      return next();
    }

    const customer = await customerModel.findCustomerBySessionToken(token);

    if (customer) {
      req.customer = customerModel.toCustomerProfile(customer);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireCustomerAuth(req, res, next) {
  try {
    const token = readBearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Authentication token is required."
      });
    }

    const customer = await customerModel.findCustomerBySessionToken(token);

    if (!customer) {
      return res.status(401).json({
        message: "Invalid or expired authentication token."
      });
    }

    req.customer = customerModel.toCustomerProfile(customer);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  attachCustomerIfPresent,
  requireCustomerAuth
};
