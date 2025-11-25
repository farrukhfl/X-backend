const Notification = require("../models/Notification");

// Get all notifications for logged-in user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "_id name avatar username")
      .populate("tweet", "_id text")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      notifications
    });

  } catch (err) {
    console.error("getNotifications error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark notifications as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ success: true, message: "All notifications marked as read" });

  } catch (err) {
    console.error("markNotificationsRead error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
