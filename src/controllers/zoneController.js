const zoneModel = require("../models/zoneModel");

function emitZoneUpdated(io, zone) {
  if (!io || !zone) {
    return;
  }

  io.emit("zone_updated", zone);
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

    const existingZone = await zoneModel.getZoneById(zoneId);

    if (!existingZone) {
      return res.status(404).json({
        message: "Zone not found."
      });
    }

    const zone = await zoneModel.updateZone(zoneId, req.body || {});
    emitZoneUpdated(req.app.get("io"), zone);
    return res.status(200).json(zone);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getZones,
  updateZone
};
