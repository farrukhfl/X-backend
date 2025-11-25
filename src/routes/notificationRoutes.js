const express = require("express");
const router = express.Router();
const { getNotifications, markAsRead } = require("../controllers/notificationController");
const auth = require("../middleware/authMiddleware");

router.get("/", auth, getNotifications);
router.put("/read", auth, markAsRead);

module.exports = router;
