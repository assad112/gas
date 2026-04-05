const {
  getRouteBetweenCoordinates
} = require("../services/trackingRouteService");
const { validateCoordinatePair } = require("../utils/coordinates");

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function readCoordinate(source, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return toNullableNumber(source[key]);
    }
  }

  return null;
}

async function getRoute(req, res, next) {
  try {
    const source = {
      ...req.query,
      ...req.body
    };
    const fromLat = readCoordinate(source, ["fromLat", "from_lat"]);
    const fromLng = readCoordinate(source, [
      "fromLng",
      "fromLon",
      "fromLong",
      "fromLongitude",
      "from_lng",
      "from_lon",
      "from_long",
      "from_longitude"
    ]);
    const toLat = readCoordinate(source, ["toLat", "to_lat"]);
    const toLng = readCoordinate(source, [
      "toLng",
      "toLon",
      "toLong",
      "toLongitude",
      "to_lng",
      "to_lon",
      "to_long",
      "to_longitude"
    ]);

    const originError = validateCoordinatePair({
      latitude: fromLat,
      longitude: fromLng,
      requirePair: true
    });
    const destinationError = validateCoordinatePair({
      latitude: toLat,
      longitude: toLng,
      requirePair: true
    });

    if (originError || destinationError) {
      return res.status(400).json({
        message:
          originError ||
          destinationError ||
          "Valid route coordinates are required."
      });
    }

    const route = await getRouteBetweenCoordinates(
      {
        latitude: fromLat,
        longitude: fromLng
      },
      {
        latitude: toLat,
        longitude: toLng
      }
    );

    return res.status(200).json(route);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getRoute
};
