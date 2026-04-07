const express = require("express");

const {
  getErrorLogs,
  getErrorLogDetails
} = require("../controllers/errorLogController");

const router = express.Router();

router.get("/", getErrorLogs);
router.get("/:id", getErrorLogDetails);

module.exports = router;
