const driverModel = require("../models/driverModel");
const { hashPassword } = require("../utils/password");
const { validateCoordinatePair } = require("../utils/coordinates");
const {
  buildDriverUsernameBase,
  buildDriverUsernameVariant,
  generateTemporaryPassword
} = require("../utils/driverCredentials");

const ADMIN_ROOM = "admin_dashboard";
const DRIVERS_ROOM = "drivers_live";
const ALLOWED_DRIVER_STATUS = new Set(["online", "offline"]);
const ALLOWED_DRIVER_AVAILABILITY = new Set(["available", "busy"]);

function isValidString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toNullableString(value) {
  return isValidString(value) ? value.trim() : null;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function readStatus(value) {
  const normalized = toNullableString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeEmail(email) {
  return toNullableString(email)?.toLowerCase() || null;
}

function resolveDuplicateMessage(error) {
  const detail = error?.detail || "";
  const constraint = error?.constraint || "";

  if (detail.includes("(phone)") || constraint.includes("phone")) {
    return "A driver with this phone already exists.";
  }

  if (detail.includes("(email)") || constraint.includes("email")) {
    return "A driver with this email already exists.";
  }

  if (detail.includes("(username)") || constraint.includes("username")) {
    return "Generated driver username already exists. Please try again.";
  }

  return "Driver already exists.";
}

function emitDriverUpdated(io, driver, eventName = "driver_updated") {
  if (!io || !driver) {
    return;
  }

  const driverId = driver.id || driver?.driver?.id;
  const targetRooms = [ADMIN_ROOM, DRIVERS_ROOM];

  if (driverId) {
    targetRooms.push(`driver:${driverId}`);
  }

  for (const roomName of targetRooms) {
    io.to(roomName).emit(eventName, driver);

    if (eventName !== "driver_updated") {
      io.to(roomName).emit("driver_updated", driver);
    }
  }
}

function emitDriverDeleted(io, driverId) {
  if (!io || !driverId) {
    return;
  }

  io.to(ADMIN_ROOM).emit("driver_deleted", {
    id: Number(driverId)
  });
}

async function generateUniqueUsername({ name, phone }) {
  const baseUsername = buildDriverUsernameBase(name, phone);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate =
      attempt === 0
        ? baseUsername
        : buildDriverUsernameVariant(baseUsername);

    const existingDriver = await driverModel.findDriverByUsername(candidate);

    if (!existingDriver) {
      return candidate;
    }
  }

  return buildDriverUsernameVariant("driver");
}

async function getDrivers(_req, res, next) {
  try {
    const drivers = await driverModel.getAllDrivers();
    return res.status(200).json(drivers);
  } catch (error) {
    return next(error);
  }
}

async function createDriver(req, res, next) {
  try {
    const name = toNullableString(req.body.name);
    const phone = toNullableString(req.body.phone);
    const email = normalizeEmail(req.body.email);
    const status = readStatus(req.body.status) || "offline";
    const availability = readStatus(req.body.availability) || "available";
    const currentLocation = toNullableString(
      req.body.currentLocation ?? req.body.current_location
    );
    const currentLatitude = toNullableNumber(
      req.body.currentLatitude ?? req.body.current_latitude
    );
    const currentLongitude = toNullableNumber(
      req.body.currentLongitude ?? req.body.current_longitude
    );
    const vehicleLabel = toNullableString(
      req.body.vehicleLabel ?? req.body.vehicle_label
    );
    const licenseNumber = toNullableString(
      req.body.licenseNumber ?? req.body.license_number
    );

    if (!name || !phone) {
      return res.status(400).json({
        message: "name and phone are required."
      });
    }

    if (!ALLOWED_DRIVER_STATUS.has(status)) {
      return res.status(400).json({
        message: "Invalid driver status."
      });
    }

    if (!ALLOWED_DRIVER_AVAILABILITY.has(availability)) {
      return res.status(400).json({
        message: "Invalid driver availability."
      });
    }

    const coordinateError = validateCoordinatePair({
      latitude: currentLatitude,
      longitude: currentLongitude,
      requirePair: currentLatitude !== null || currentLongitude !== null
    });

    if (coordinateError) {
      return res.status(400).json({
        message: coordinateError
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    let generatedUsername = null;
    let createdDriver = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      generatedUsername = await generateUniqueUsername({ name, phone });

      try {
        createdDriver = await driverModel.createDriver({
          name,
          username: generatedUsername,
          phone,
          email,
          passwordHash: hashPassword(temporaryPassword),
          status,
          availability,
          currentLocation,
          currentLatitude,
          currentLongitude,
          vehicleLabel,
          licenseNumber
        });
        break;
      } catch (error) {
        const isUsernameConflict =
          error?.code === "23505" &&
          (String(error?.detail || "").includes("(username)") ||
            String(error?.constraint || "").includes("username"));

        if (!isUsernameConflict || attempt === 3) {
          throw error;
        }
      }
    }

    emitDriverUpdated(req.app.get("io"), createdDriver, "driver_created");
    return res.status(201).json({
      driver: createdDriver,
      credentials: {
        username: generatedUsername,
        temporaryPassword
      }
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

async function updateDriver(req, res, next) {
  try {
    const driverId = Number(req.params.id);

    if (Number.isNaN(driverId) || driverId <= 0) {
      return res.status(400).json({
        message: "Invalid driver id."
      });
    }

    const existingDriver = await driverModel.getDriverById(driverId);

    if (!existingDriver) {
      return res.status(404).json({
        message: "Driver not found."
      });
    }

    const payload = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = toNullableString(req.body.name);

      if (!name) {
        return res.status(400).json({
          message: "Driver name cannot be empty."
        });
      }

      payload.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "phone")) {
      const phone = toNullableString(req.body.phone);

      if (!phone) {
        return res.status(400).json({
          message: "Driver phone cannot be empty."
        });
      }

      payload.phone = phone;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "email")) {
      payload.email = normalizeEmail(req.body.email);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "password")) {
      const password = toNullableString(req.body.password);

      if (!password) {
        return res.status(400).json({
          message: "Driver password cannot be empty."
        });
      }

      payload.passwordHash = hashPassword(password);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
      const status = readStatus(req.body.status);

      if (!status || !ALLOWED_DRIVER_STATUS.has(status)) {
        return res.status(400).json({
          message: "Invalid driver status."
        });
      }

      payload.status = status;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "availability")) {
      const availability = readStatus(req.body.availability);

      if (!availability || !ALLOWED_DRIVER_AVAILABILITY.has(availability)) {
        return res.status(400).json({
          message: "Invalid driver availability."
        });
      }

      payload.availability = availability;
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, "currentLocation") ||
      Object.prototype.hasOwnProperty.call(req.body, "current_location")
    ) {
      payload.currentLocation = toNullableString(
        req.body.currentLocation ?? req.body.current_location
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, "currentLatitude") ||
      Object.prototype.hasOwnProperty.call(req.body, "current_latitude")
    ) {
      payload.currentLatitude = toNullableNumber(
        req.body.currentLatitude ?? req.body.current_latitude
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, "currentLongitude") ||
      Object.prototype.hasOwnProperty.call(req.body, "current_longitude")
    ) {
      payload.currentLongitude = toNullableNumber(
        req.body.currentLongitude ?? req.body.current_longitude
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, "vehicleLabel") ||
      Object.prototype.hasOwnProperty.call(req.body, "vehicle_label")
    ) {
      payload.vehicleLabel = toNullableString(
        req.body.vehicleLabel ?? req.body.vehicle_label
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, "licenseNumber") ||
      Object.prototype.hasOwnProperty.call(req.body, "license_number")
    ) {
      payload.licenseNumber = toNullableString(
        req.body.licenseNumber ?? req.body.license_number
      );
    }

    const coordinateError = validateCoordinatePair({
      latitude: payload.currentLatitude,
      longitude: payload.currentLongitude,
      requirePair:
        Object.prototype.hasOwnProperty.call(payload, "currentLatitude") ||
        Object.prototype.hasOwnProperty.call(payload, "currentLongitude")
    });

    if (coordinateError) {
      return res.status(400).json({
        message: coordinateError
      });
    }

    const updatedDriver = await driverModel.updateDriver(driverId, payload);

    emitDriverUpdated(req.app.get("io"), updatedDriver);
    return res.status(200).json(updatedDriver);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({
        message: resolveDuplicateMessage(error)
      });
    }

    return next(error);
  }
}

async function resetDriverPassword(req, res, next) {
  try {
    const driverId = Number(req.params.id);

    if (Number.isNaN(driverId) || driverId <= 0) {
      return res.status(400).json({
        message: "Invalid driver id."
      });
    }

    const existingDriver = await driverModel.getDriverById(driverId);

    if (!existingDriver) {
      return res.status(404).json({
        message: "Driver not found."
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    const updatedDriver = await driverModel.updateDriver(driverId, {
      passwordHash: hashPassword(temporaryPassword),
      sessionToken: null
    });

    emitDriverUpdated(req.app.get("io"), updatedDriver, "driver_password_reset");

    return res.status(200).json({
      driver: updatedDriver,
      credentials: {
        username: updatedDriver?.username || existingDriver?.username || "",
        temporaryPassword
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteDriver(req, res, next) {
  try {
    const driverId = Number(req.params.id);

    if (Number.isNaN(driverId) || driverId <= 0) {
      return res.status(400).json({
        message: "Invalid driver id."
      });
    }

    const existingDriver = await driverModel.getDriverById(driverId);

    if (!existingDriver) {
      return res.status(404).json({
        message: "Driver not found."
      });
    }

    const deletedDriver = await driverModel.deleteDriver(driverId);

    emitDriverDeleted(req.app.get("io"), driverId);

    return res.status(200).json({
      message: "Driver deleted successfully.",
      driver: deletedDriver || existingDriver
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  emitDriverDeleted,
  emitDriverUpdated,
  getDrivers,
  createDriver,
  updateDriver,
  resetDriverPassword,
  deleteDriver
};

