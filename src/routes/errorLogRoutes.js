const express = require("express");

const {
  getErrorLogs,
  getErrorLogDetails,
  createClientErrorLog
} = require("../controllers/errorLogController");

const router = express.Router();

router.get("/", getErrorLogs);
router.post("/client-report", createClientErrorLog);
router.get("/:id", getErrorLogDetails);

module.exports = router;
