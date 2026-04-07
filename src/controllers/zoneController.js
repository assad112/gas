const zoneModel = require("../models/zoneModel");
const { computeCentroid, parsePolygonInput } = require("../utils/geometry");

function emitZoneUpdated(io, zone) {
  if (!io || !zone) {
    return;
  }

  io.emit("zone_updated", zone);
}

function emitZoneDeleted(io, zone) {
  if (!io || !zone) {
    return;
  }

  io.emit("zone_deleted", {
    id: zone.id,
    code: zone.code
  });
}

async function getZones(_req, res, next) {
  try {
    const zones = await zoneModel.getAllZones();
    return res.status(200).json(zones);
  } catch (error) {
    return next(error);
  }
}

async function updateZone(req, res, next) {
  try {
    const zoneId = Number(req.params.id);

    if (Number.isNaN(zoneId) || zoneId <= 0) {
      return res.status(400).json({
        message: "Invalid zone id."
      });
    }

    const payload = { ...(req.body || {}) };

    if (
      Object.prototype.hasOwnProperty.call(payload, "polygon") ||
      Object.prototype.hasOwnProperty.call(payload, "polygon_geojson") ||
      Object.prototype.hasOwnProperty.call(payload, "polygonGeoJson")
    ) {
      const normalizedPolygon = parsePolygonInput(
        payload.polygon ?? payload.polygon_geojson ?? payload.polygonGeoJson
      );

      if (!normalizedPolygon) {
        return res.status(400).json({
          message: "Valid zone polygon coordinates are required."
        });
      }

      payload.polygon = normalizedPolygon;

      if (
        !Object.prototype.hasOwnProperty.call(payload, "centerLatitude") &&
        !Object.prototype.hasOwnProperty.call(payload, "center_latitude")
      ) {
        payload.centerLatitude = computeCentroid(normalizedPolygon)?.latitude;
      }

      if (
        !Object.prototype.hasOwnProperty.call(payload, "centerLongitude") &&
        !Object.prototype.hasOwnProperty.call(payload, "center_longitude")
      ) {
        payload.centerLongitude = computeCentroid(normalizedPolygon)?.longitude;
      }
    }

    const existingZone = await zoneModel.getZoneById(zoneId);

    if (!existingZone) {
      return res.status(404).json({
        message: "Zone not found."
      });
    }

    const zone = await zoneModel.updateZone(zoneId, payload);
    emitZoneUpdated(req.app.get("io"), zone);
    return res.status(200).json(zone);
  } catch (error) {
    return next(error);
  }
}

async function deleteZone(req, res, next) {
  try {
    const zoneId = Number(req.params.id);

    if (Number.isNaN(zoneId) || zoneId <= 0) {
      return res.status(400).json({
        message: "Invalid zone id."
      });
    }

    const existingZone = await zoneModel.getZoneById(zoneId);

    if (!existingZone) {
      return res.status(404).json({
        message: "Zone not found."
      });
    }

    const deletedZone = await zoneModel.deleteZone(zoneId);
    emitZoneDeleted(req.app.get("io"), deletedZone);

    return res.status(200).json({
      zone: deletedZone
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getZones,
  updateZone,
  deleteZone
};
