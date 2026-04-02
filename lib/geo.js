function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function toLatitude(value) {
  const parsedValue = toFiniteNumber(value);

  if (parsedValue === null || parsedValue < -90 || parsedValue > 90) {
    return null;
  }

  return parsedValue;
}

export function toLongitude(value) {
  const parsedValue = toFiniteNumber(value);

  if (parsedValue === null || parsedValue < -180 || parsedValue > 180) {
    return null;
  }

  return parsedValue;
}

export function hasCoordinates(latitude, longitude) {
  return toLatitude(latitude) !== null && toLongitude(longitude) !== null;
}

export function getOrderCustomerCoordinates(order) {
  if (!order) {
    return null;
  }

  const latitude = toLatitude(order.customerLatitude ?? order.latitude);
  const longitude = toLongitude(order.customerLongitude ?? order.longitude);

  return hasCoordinates(latitude, longitude) ? { latitude, longitude } : null;
}

export function getOrderDriverCoordinates(order) {
  if (!order) {
    return null;
  }

  const latitude = toLatitude(order.driverLatitude);
  const longitude = toLongitude(order.driverLongitude);

  return hasCoordinates(latitude, longitude) ? { latitude, longitude } : null;
}

export function getDriverCoordinates(driver) {
  if (!driver) {
    return null;
  }

  const latitude = toLatitude(driver.currentLatitude);
  const longitude = toLongitude(driver.currentLongitude);

  return hasCoordinates(latitude, longitude) ? { latitude, longitude } : null;
}

export function formatCoordinates(latitude, longitude, digits = 5) {
  if (!hasCoordinates(latitude, longitude)) {
    return null;
  }

  return `${Number(latitude).toFixed(digits)}, ${Number(longitude).toFixed(digits)}`;
}

export function haversineDistanceKm(origin, destination) {
  if (
    !origin ||
    !destination ||
    !hasCoordinates(origin.latitude, origin.longitude) ||
    !hasCoordinates(destination.latitude, destination.longitude)
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const startLatitude = toRadians(origin.latitude);
  const endLatitude = toRadians(destination.latitude);

  const halfChord =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const angularDistance =
    2 * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord));

  return earthRadiusKm * angularDistance;
}

export function isLocationStale(value, maxMinutes = 20) {
  if (!value) {
    return true;
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > maxMinutes * 60 * 1000;
}

export function projectGeoPoints(points, { padding = 12 } = {}) {
  const validPoints = points.filter((point) =>
    hasCoordinates(point.latitude, point.longitude)
  );

  if (validPoints.length === 0) {
    return {};
  }

  const latitudes = validPoints.map((point) => point.latitude);
  const longitudes = validPoints.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.02);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.02);
  const drawableArea = 100 - padding * 2;

  return validPoints.reduce((result, point) => {
    const x =
      padding + ((point.longitude - minLongitude) / longitudeRange) * drawableArea;
    const y =
      100 -
      padding -
      ((point.latitude - minLatitude) / latitudeRange) * drawableArea;

    result[point.key] = {
      ...point,
      x,
      y
    };

    return result;
  }, {});
}
