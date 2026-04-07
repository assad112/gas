const EARTH_RADIUS_METERS = 6371000;

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizePoint(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const latitude = toFiniteNumber(
    value.latitude ?? value.lat ?? value[1] ?? value.y
  );
  const longitude = toFiniteNumber(
    value.longitude ?? value.lng ?? value.lon ?? value.long ?? value[0] ?? value.x
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
}

function closeRing(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  const normalizedPoints = points.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude
  }));
  const firstPoint = normalizedPoints[0];
  const lastPoint = normalizedPoints[normalizedPoints.length - 1];

  if (
    firstPoint.latitude !== lastPoint.latitude ||
    firstPoint.longitude !== lastPoint.longitude
  ) {
    normalizedPoints.push({
      latitude: firstPoint.latitude,
      longitude: firstPoint.longitude
    });
  }

  return normalizedPoints;
}

function parsePolygonInput(input) {
  if (!input) {
    return null;
  }

  let parsedInput = input;

  if (typeof parsedInput === "string") {
    try {
      parsedInput = JSON.parse(parsedInput);
    } catch {
      return null;
    }
  }

  let rawPoints = null;

  if (Array.isArray(parsedInput)) {
    rawPoints = parsedInput;
  } else if (parsedInput?.type === "Polygon") {
    rawPoints = Array.isArray(parsedInput.coordinates)
      ? parsedInput.coordinates[0]
      : null;
  } else if (Array.isArray(parsedInput?.points)) {
    rawPoints = parsedInput.points;
  } else if (Array.isArray(parsedInput?.polygon)) {
    rawPoints = parsedInput.polygon;
  } else if (Array.isArray(parsedInput?.coordinates)) {
    rawPoints = parsedInput.coordinates;
  } else if (parsedInput?.geometry?.type === "Polygon") {
    rawPoints = parsedInput.geometry.coordinates?.[0];
  }

  if (!Array.isArray(rawPoints)) {
    return null;
  }

  const normalizedPoints = rawPoints.map(normalizePoint).filter(Boolean);

  if (normalizedPoints.length < 3) {
    return null;
  }

  return closeRing(normalizedPoints);
}

function polygonToGeoJson(points) {
  const ring = closeRing((points || []).map(normalizePoint).filter(Boolean));

  if (ring.length < 4) {
    return null;
  }

  return {
    type: "Polygon",
    coordinates: [
      ring.map((point) => [point.longitude, point.latitude])
    ]
  };
}

function pointInPolygon(pointInput, polygonInput) {
  const point = normalizePoint(pointInput);
  const polygon = parsePolygonInput(polygonInput);

  if (!point || !polygon) {
    return false;
  }

  let isInside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const currentPoint = polygon[i];
    const previousPoint = polygon[j];

    const intersects =
      currentPoint.longitude > point.longitude !==
        previousPoint.longitude > point.longitude &&
      point.latitude <
        ((previousPoint.latitude - currentPoint.latitude) *
          (point.longitude - currentPoint.longitude)) /
          (previousPoint.longitude - currentPoint.longitude) +
          currentPoint.latitude;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(originInput, destinationInput) {
  const origin = normalizePoint(originInput);
  const destination = normalizePoint(destinationInput);

  if (!origin || !destination) {
    return null;
  }

  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitudeRadians = toRadians(origin.latitude);
  const destinationLatitudeRadians = toRadians(destination.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitudeRadians) *
      Math.cos(destinationLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function computeCentroid(pointsInput) {
  const points = closeRing((pointsInput || []).map(normalizePoint).filter(Boolean));

  if (points.length < 4) {
    return null;
  }

  const sourcePoints = points.slice(0, -1);
  const totals = sourcePoints.reduce(
    (accumulator, point) => ({
      latitude: accumulator.latitude + point.latitude,
      longitude: accumulator.longitude + point.longitude
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: Number((totals.latitude / sourcePoints.length).toFixed(6)),
    longitude: Number((totals.longitude / sourcePoints.length).toFixed(6))
  };
}

function projectPoint(origin, point) {
  const latitudeScale = 111320;
  const longitudeScale =
    111320 * Math.cos(toRadians((origin.latitude + point.latitude) / 2));

  return {
    x: (point.longitude - origin.longitude) * longitudeScale,
    y: (point.latitude - origin.latitude) * latitudeScale
  };
}

function distanceMetersToSegment(pointInput, startInput, endInput) {
  const point = normalizePoint(pointInput);
  const start = normalizePoint(startInput);
  const end = normalizePoint(endInput);

  if (!point || !start || !end) {
    return null;
  }

  const relativePoint = projectPoint(start, point);
  const relativeEnd = projectPoint(start, end);
  const dx = relativeEnd.x;
  const dy = relativeEnd.y;
  const squaredLength = dx * dx + dy * dy;

  if (squaredLength === 0) {
    return Math.sqrt(
      relativePoint.x * relativePoint.x + relativePoint.y * relativePoint.y
    );
  }

  const projectionRatio = Math.max(
    0,
    Math.min(
      1,
      (relativePoint.x * dx + relativePoint.y * dy) / squaredLength
    )
  );
  const projectedX = projectionRatio * dx;
  const projectedY = projectionRatio * dy;
  const deltaX = relativePoint.x - projectedX;
  const deltaY = relativePoint.y - projectedY;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function distanceMetersToPolyline(pointInput, polylineInput) {
  const point = normalizePoint(pointInput);
  const polyline = (polylineInput || []).map(normalizePoint).filter(Boolean);

  if (!point || polyline.length === 0) {
    return null;
  }

  if (polyline.length === 1) {
    return haversineDistanceMeters(point, polyline[0]);
  }

  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const distance = distanceMetersToSegment(
      point,
      polyline[index],
      polyline[index + 1]
    );

    if (distance !== null && distance < minDistance) {
      minDistance = distance;
    }
  }

  return Number.isFinite(minDistance) ? minDistance : null;
}

module.exports = {
  toFiniteNumber,
  normalizePoint,
  closeRing,
  parsePolygonInput,
  polygonToGeoJson,
  pointInPolygon,
  haversineDistanceMeters,
  computeCentroid,
  distanceMetersToPolyline
};
