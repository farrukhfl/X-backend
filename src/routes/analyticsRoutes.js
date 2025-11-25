const express = require("express");
const router = express.Router();
const { getUserAnalytics } = require("../controllers/analyticsController");
const auth = require("../middleware/authMiddleware");

// GET /api/analytics/:userId
router.get("/:userId", auth, getUserAnalytics);

module.exports = router;
