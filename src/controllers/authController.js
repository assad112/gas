const customerModel = require("../models/customerModel");
const {
  hashPassword,
  verifyPassword,
  generateSessionToken
} = require("../utils/password");

const ADMIN_ROOM = "admin_dashboard";

function isValidString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeEmail(email) {
  if (!isValidString(email)) {
    return null;
  }

  return email.trim().toLowerCase();
}

function resolveDuplicateMessage(error) {
  const detail = error?.detail || "";
  const constraint = error?.constraint || "";

  if (detail.includes("(phone)") || constraint.includes("phone")) {
    return "A customer with this phone number already exists.";
  }

  if (detail.includes("(email)") || constraint.includes("email")) {
    return "A customer with this email already exists.";
  }

  return "Customer already exists.";
}

function emitCustomerRegistered(io, customer) {
  if (!io || !customer) {
    return;
  }

  io.to(ADMIN_ROOM).emit("customer_registered", {
    id: Number(customer.id),
    full_name: customer.fullName || "",
    phone: customer.phone || "",
    email: customer.email || "",
    orders_count: 0,
    last_order_at: null,
    created_at: new Date().toISOString()
  });
}

async function registerCustomer(req, res, next) {
  try {
    const { fullName, phone, email, password } = req.body;

    if (
      !isValidString(fullName) ||
      !isValidString(phone) ||
      !isValidString(password)
    ) {
      return res.status(400).json({
        message: "fullName, phone, and password are required."
      });
    }

    const sessionToken = generateSessionToken();
    const customer = await customerModel.createCustomer({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: normalizeEmail(email),
      passwordHash: hashPassword(password.trim()),
      sessionToken
    });

    emitCustomerRegistered(req.app.get("io"), customer);

    return res.status(201).json({
      token: sessionToken,
      user: customer
    });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({
        message: resolveDuplicateMessage(error)
      });
    }

    return next(error);
  }
}

async function loginCustomer(req, res, next) {
  try {
    const { identifier, password } = req.body;

    if (!isValidString(identifier) || !isValidString(password)) {
      return res.status(400).json({
        message: "identifier and password are required."
      });
    }

    const customer = await customerModel.findCustomerAuthByIdentifier(
      identifier.trim()
    );

    if (!customer || !verifyPassword(password.trim(), customer.password_hash)) {
      return res.status(401).json({
        message: "Invalid login credentials."
      });
    }

    const sessionToken = generateSessionToken();
    const user = await customerModel.updateSessionToken(customer.id, sessionToken);

    return res.status(200).json({
      token: sessionToken,
      user
    });
  } catch (error) {
    return next(error);
  }
}

function getCurrentCustomer(req, res) {
  return res.status(200).json({
    user: req.customer
  });
}

async function logoutCustomer(req, res, next) {
  try {
    await customerModel.clearSessionToken(Number(req.customer.id));

    return res.status(200).json({
      message: "Logged out successfully."
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerCustomer,
  loginCustomer,
  getCurrentCustomer,
  logoutCustomer
};
