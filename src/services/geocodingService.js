const axios = require("axios");

const {
  normalizePoint,
  toFiniteNumber
} = require("../utils/geometry");

const GEOCODING_BASE_URL =
  process.env.GEOCODING_BASE_URL?.trim() ||
  "https://nominatim.openstreetmap.org";
const GEOCODING_TIMEOUT_MS = Number.parseInt(
  process.env.GEOCODING_TIMEOUT_MS || "5000",
  10
);
const GEOCODING_CACHE_TTL_MS = Number.parseInt(
  process.env.GEOCODING_CACHE_TTL_MS || "300000",
  10
);

const DEFAULT_VIEWBOX = (
  process.env.GEOCODING_DEFAULT_VIEWBOX || "51.5,26.5,60.9,16.5"
)
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value));

const cache = new Map();

function readCache(cacheKey) {
  const cachedValue = cache.get(cacheKey);

  if (!cachedValue) {
    return null;
  }

  if (Date.now() - cachedValue.createdAt > GEOCODING_CACHE_TTL_MS) {
    cache.delete(cacheKey);
    return null;
  }

  return cachedValue.value;
}

function writeCache(cacheKey, value) {
  cache.set(cacheKey, {
    createdAt: Date.now(),
    value
  });
}

function buildResult(item) {
  const point = normalizePoint({
    latitude: item.lat,
    longitude: item.lon
  });

  if (!point) {
    return null;
  }

  return {
    latitude: point.latitude,
    longitude: point.longitude,
    address: item.display_name || "",
    name:
      item.name ||
      item.display_name?.split(",")?.[0]?.trim() ||
      item.address?.road ||
      "",
    type: item.type || item.class || "",
    raw: item
  };
}

async function searchPlaces(query, { limit = 6 } = {}) {
  const normalizedQuery = String(query || "").trim();

  if (!normalizedQuery) {
    return [];
  }

  const cacheKey = `search:${normalizedQuery.toLowerCase()}:${limit}`;
  const cachedValue = readCache(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const response = await axios.get(`${GEOCODING_BASE_URL}/search`, {
    timeout: GEOCODING_TIMEOUT_MS,
    params: {
      q: normalizedQuery,
      format: "jsonv2",
      limit,
      addressdetails: 1,
      countrycodes: "om",
      bounded: 1,
      ...(DEFAULT_VIEWBOX.length === 4
        ? { viewbox: DEFAULT_VIEWBOX.join(",") }
        : {})
    },
    headers: {
      "User-Agent": "GasDeliveryAdmin/1.0"
    }
  });

  const results = Array.isArray(response.data)
    ? response.data.map(buildResult).filter(Boolean)
    : [];

  writeCache(cacheKey, results);
  return results;
}

async function reverseGeocode(latitude, longitude) {
  const point = normalizePoint({ latitude, longitude });

  if (!point) {
    return null;
  }

  const cacheKey = `reverse:${point.latitude.toFixed(6)}:${point.longitude.toFixed(6)}`;
  const cachedValue = readCache(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const response = await axios.get(`${GEOCODING_BASE_URL}/reverse`, {
    timeout: GEOCODING_TIMEOUT_MS,
    params: {
      lat: point.latitude,
      lon: point.longitude,
      format: "jsonv2",
      addressdetails: 1
    },
    headers: {
      "User-Agent": "GasDeliveryAdmin/1.0"
    }
  });

  const result = buildResult(response.data) || {
    latitude: point.latitude,
    longitude: point.longitude,
    address: "",
    name: "",
    type: ""
  };

  writeCache(cacheKey, result);
  return result;
}

function readCoordinate(value) {
  const parsedValue = toFiniteNumber(value);
  return parsedValue === null ? null : parsedValue;
}

module.exports = {
  searchPlaces,
  reverseGeocode,
  readCoordinate
};
