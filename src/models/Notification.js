const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who gets notified
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who triggered the notification
    type: {
      type: String,
      enum: ["like", "retweet", "reply", "quote", "follow"],
      required: true
    },
    tweet: { type: mongoose.Schema.Types.ObjectId, ref: "Tweet" }, // optional, only for tweet-related actions
    read: { type: Boolean, default: false }, // unread by default
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
