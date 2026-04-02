const settingsModel = require("../models/settingsModel");

function emitSettingsUpdated(io, settings) {
  if (!io || !settings) {
    return;
  }

  io.emit("settings_updated", settings);
}

async function getSettings(_req, res, next) {
  try {
    const settings = await settingsModel.getSettings();
    return res.status(200).json(settings);
  } catch (error) {
    return next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const settings = await settingsModel.updateSettings(req.body || {});
    emitSettingsUpdated(req.app.get("io"), settings);
    return res.status(200).json(settings);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings
};
