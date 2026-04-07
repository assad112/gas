const express = require("express");

const {
  geocodeSearch,
  reverseLookup,
  getAnalytics,
  getTrail
} = require("../controllers/mapController");

const router = express.Router();

router.get("/analytics", getAnalytics);
router.get("/trail", getTrail);
router.get("/geocode", geocodeSearch);
router.get("/reverse", reverseLookup);

module.exports = router;
