const express = require("express");

const {
  getDriverDashboard,
  getDriverProfile,
  updateAvailability,
  updateLocation,
  registerPushToken,
  getAvailableOrders,
  getActiveOrders,
  getOrderHistory,
  getDriverOrderDetails,
  acceptOrder,
  rejectOrder,
  updateOrderStage,
  getEarningsSummary,
  getNotifications
} = require("../controllers/driverAppController");
const { requireDriverAuth } = require("../middleware/driverAuth");

const router = express.Router();

router.use(requireDriverAuth);

router.get("/dashboard", getDriverDashboard);
router.get("/profile", getDriverProfile);
router.patch("/availability", updateAvailability);
router.patch("/location", updateLocation);
router.post("/push-token", registerPushToken);

router.get("/orders/available", getAvailableOrders);
router.get("/orders/active", getActiveOrders);
router.get("/orders/history", getOrderHistory);
router.get("/orders/:id", getDriverOrderDetails);
router.post("/orders/:id/accept", acceptOrder);
router.post("/orders/:id/reject", rejectOrder);
router.patch("/orders/:id/stage", updateOrderStage);

router.get("/earnings/summary", getEarningsSummary);
router.get("/notifications", getNotifications);

module.exports = router;
