const express = require("express");

const {
  registerCustomer,
  loginCustomer,
  getCurrentCustomer,
  logoutCustomer
} = require("../controllers/authController");
const { requireCustomerAuth } = require("../middleware/customerAuth");

const router = express.Router();

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.get("/me", requireCustomerAuth, getCurrentCustomer);
router.post("/logout", requireCustomerAuth, logoutCustomer);

module.exports = router;
