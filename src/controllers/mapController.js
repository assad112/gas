const { reverseGeocode, searchPlaces, readCoordinate } = require("../services/geocodingService");
const {
  getDriverTrail,
  getMapAnalytics
} = require("../services/mapOperationsService");

function readPositiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallbackValue;
}

async function geocodeSearch(req, res, next) {
  try {
    const query = String(req.query.query ?? req.query.q ?? "").trim();

    if (!query) {
      return res.status(400).json({
        message: "query is required."
      });
    }

    const results = await searchPlaces(query, {
      limit: readPositiveInteger(req.query.limit, 6)
    });

    return res.status(200).json({
      query,
      results
    });
  } catch (error) {
    return next(error);
  }
}

async function reverseLookup(req, res, next) {
  try {
    const latitude = readCoordinate(req.query.latitude ?? req.query.lat);
    const longitude = readCoordinate(
      req.query.longitude ?? req.query.lng ?? req.query.lon
    );

    if (latitude === null || longitude === null) {
      return res.status(400).json({
        message: "latitude and longitude are required."
      });
    }

    const result = await reverseGeocode(latitude, longitude);

    return res.status(200).json(result || {});
  } catch (error) {
    return next(error);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const analytics = await getMapAnalytics();
    return res.status(200).json(analytics);
  } catch (error) {
    return next(error);
  }
}

async function getTrail(req, res, next) {
  try {
    const driverId = readPositiveInteger(req.query.driverId, null);
    const orderId = readPositiveInteger(req.query.orderId, null);

    if (!driverId && !orderId) {
      return res.status(400).json({
        message: "driverId or orderId is required."
      });
    }

    const trail = await getDriverTrail({
      driverId,
      orderId,
      limit: readPositiveInteger(req.query.limit, 120)
    });

    return res.status(200).json(
      trail.map((entry) => ({
        id: entry.id,
        driverId: entry.driver_id,
        orderId: entry.order_id,
        latitude: Number(entry.latitude),
        longitude: Number(entry.longitude),
        accuracyMeters: entry.accuracy_meters,
        speedMps: entry.speed_mps,
        headingDegrees: entry.heading_degrees,
        source: entry.source,
        createdAt: entry.created_at
      }))
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  geocodeSearch,
  reverseLookup,
  getAnalytics,
  getTrail
};
