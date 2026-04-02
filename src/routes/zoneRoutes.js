const express = require("express");

const { getZones, updateZone } = require("../controllers/zoneController");

const router = express.Router();

router.get("/", getZones);
router.patch("/:id", updateZone);

module.exports = router;
