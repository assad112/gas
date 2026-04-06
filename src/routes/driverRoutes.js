const express = require("express");

const {
  getDrivers,
  createDriver,
  updateDriver,
  resetDriverPassword,
  deleteDriver
} = require("../controllers/driverController");

const router = express.Router();

router.get("/", getDrivers);
router.post("/", createDriver);
router.patch("/:id", updateDriver);
router.post("/:id/reset-password", resetDriverPassword);
router.delete("/:id", deleteDriver);

module.exports = router;
