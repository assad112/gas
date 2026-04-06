const express = require("express");

const {
  getZones,
  updateZone,
  deleteZone
} = require("../controllers/zoneController");

const router = express.Router();

router.get("/", getZones);
router.patch("/:id", updateZone);
router.delete("/:id", deleteZone);

module.exports = router;
