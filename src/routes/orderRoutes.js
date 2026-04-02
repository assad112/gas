const express = require("express");

const {
  createOrder,
  getOrders,
  resetOrders,
  getOrderDetails,
  updateOrder,
  cancelOrder,
  driverAcceptOrder,
  advanceOrderStatus
} = require("../controllers/orderController");
const { attachCustomerIfPresent } = require("../middleware/customerAuth");

const router = express.Router();

router.post("/", attachCustomerIfPresent, createOrder);
router.get("/", attachCustomerIfPresent, getOrders);
router.delete("/", resetOrders);
router.get("/:id", getOrderDetails);
router.patch("/:id", updateOrder);
router.post("/:id/cancel", cancelOrder);
router.post("/:id/driver-accept", driverAcceptOrder);
router.put("/:id", advanceOrderStatus);

module.exports = router;

