const express = require("express");

const {
  registerDriver,
  loginDriver,
  getCurrentDriver,
  logoutDriver
} = require("../controllers/driverAuthController");
const { requireDriverAuth } = require("../middleware/driverAuth");

const router = express.Router();

router.post("/register", registerDriver);
router.post("/login", loginDriver);
router.get("/me", requireDriverAuth, getCurrentDriver);
router.post("/logout", requireDriverAuth, logoutDriver);

module.exports = router;
