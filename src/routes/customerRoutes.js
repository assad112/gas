const express = require("express");

const {
  getCustomers,
  resetCustomerPassword,
  deleteCustomer
} = require("../controllers/customerController");

const router = express.Router();

router.get("/", getCustomers);
router.post("/:id/reset-password", resetCustomerPassword);
router.delete("/:id", deleteCustomer);

module.exports = router;
