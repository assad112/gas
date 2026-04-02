function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLatitude(value) {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

function validateCoordinatePair({
  latitude = null,
  longitude = null,
  requirePair = false
} = {}) {
  const hasLatitude = latitude !== null && latitude !== undefined;
  const hasLongitude = longitude !== null && longitude !== undefined;

  if (requirePair && hasLatitude !== hasLongitude) {
    return "latitude and longitude must be provided together.";
  }

  if (hasLatitude && !isValidLatitude(latitude)) {
    return "latitude must be a valid number between -90 and 90.";
  }

  if (hasLongitude && !isValidLongitude(longitude)) {
    return "longitude must be a valid number between -180 and 180.";
  }

  return null;
}

module.exports = {
  isValidLatitude,
  isValidLongitude,
  validateCoordinatePair
};
