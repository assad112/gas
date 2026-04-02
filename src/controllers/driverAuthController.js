const driverModel = require("../models/driverModel");
const { verifyPassword, generateSessionToken } = require("../utils/password");

const ADMIN_ROOM = "admin_dashboard";
const DRIVERS_ROOM = "drivers_live";

function isValidString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toNullableString(value) {
  return isValidString(value) ? value.trim() : null;
}

function emitDriverLifecycleEvent(io, driver, eventName = "driver_updated") {
  if (!io || !driver) {
    return;
  }

  const driverRoom = driver.id ? `driver:${driver.id}` : null;
  const targetRooms = [ADMIN_ROOM, DRIVERS_ROOM, driverRoom].filter(Boolean);

  for (const roomName of targetRooms) {
    io.to(roomName).emit(eventName, driver);

    if (eventName !== "driver_updated") {
      io.to(roomName).emit("driver_updated", driver);
    }
  }
}

async function registerDriver(req, res, next) {
  return res.status(403).json({
    message:
      "Driver self-registration is disabled. Driver accounts must be created from the admin dashboard."
  });
}

async function loginDriver(req, res, next) {
  try {
    const identifier = toNullableString(req.body.identifier);
    const password = toNullableString(req.body.password);

    if (!identifier || !password) {
      return res.status(400).json({
        message: "identifier and password are required."
      });
    }

    const driver = await driverModel.findDriverAuthByIdentifier(identifier);

    if (!driver?.password_hash || !verifyPassword(password, driver.password_hash)) {
      return res.status(401).json({
        message: "Invalid driver login credentials."
      });
    }

    const sessionToken = generateSessionToken();
    const profile = await driverModel.updateSessionToken(driver.id, sessionToken);
    const driverSnapshot = await driverModel.getDriverWithActiveOrderById(driver.id);

    emitDriverLifecycleEvent(
      req.app.get("io"),
      driverSnapshot,
      "driver_session_updated"
    );

    return res.status(200).json({
      token: sessionToken,
      driver: profile
    });
  } catch (error) {
    return next(error);
  }
}

function getCurrentDriver(req, res) {
  return res.status(200).json({
    driver: req.driver
  });
}

async function logoutDriver(req, res, next) {
  try {
    await Promise.all([
      driverModel.clearSessionToken(Number(req.driver.id)),
      driverModel.updateDriverOperationalState(Number(req.driver.id), {
        status: "offline",
        availability: "available"
      })
    ]);

    const refreshedDriver = await driverModel.getDriverWithActiveOrderById(
      Number(req.driver.id)
    );
    emitDriverLifecycleEvent(req.app.get("io"), refreshedDriver);

    return res.status(200).json({
      message: "Driver logged out successfully."
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerDriver,
  loginDriver,
  getCurrentDriver,
  logoutDriver
};
