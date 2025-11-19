const User = require("../models/User");
const bcrypt = require("bcryptjs");

const createError = require("../utils/createError"); // optional helper


const RESERVED_USERNAMES = ["admin", "support", "api", "root"]; // extend as needed




exports.getMyProfile = async (req, res) => {
  try {
    const user = req.user; // already populated by auth middleware

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        followers: user.followers.length,
        following: user.following.length,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error("Get my profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || typeof username !== "string") {
      return res.status(400).json({ success: false, message: "Invalid username" });
    }

    // Find user by username (case-insensitive)
    const user = await User.findOne({ username: username.toLowerCase() }).select(
      "-password -email" // hide password and email for public profiles
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        avatar: user.avatar,
        followers: user.followers?.length ?? 0,
        following: user.following?.length ?? 0,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("getUserByUsername error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, bio, avatar, username } = req.body;

    // Basic validation
    if (name && (typeof name !== "string" || name.length < 2 || name.length > 50)) {
      return res.status(400).json({ success: false, message: "Name must be 2-50 chars" });
    }

    if (bio && (typeof bio !== "string" || bio.length > 160)) {
      return res.status(400).json({ success: false, message: "Bio max 160 chars" });
    }

    if (username) {
      if (typeof username !== "string" || username.length < 3 || username.length > 30) {
        return res.status(400).json({ success: false, message: "Username must be 3-30 chars" });
      }

      const lowerUsername = username.toLowerCase();

      if (RESERVED_USERNAMES.includes(lowerUsername)) {
        return res.status(400).json({ success: false, message: "This username is reserved" });
      }

      // Check uniqueness (exclude current user)
      const existing = await User.findOne({ username: lowerUsername });
      if (existing && existing._id.toString() !== userId.toString()) {
        return res.status(400).json({ success: false, message: "Username already taken" });
      }
    }

    // Build update object
    const update = {};
    if (name) update.name = name.trim();
    if (typeof bio !== "undefined") update.bio = bio;
    if (avatar) update.avatar = avatar; // avatar should be a URL (we'll validate later)
    if (username) update.username = username.toLowerCase().trim();

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select(
      "-password"
    );

    return res.json({
      success: true,
      message: "Profile updated",
      user: {
        id: updated._id,
        name: updated.name,
        username: updated.username,
        email: updated.email, // internal use, you may remove from client response
        bio: updated.bio,
        avatar: updated.avatar,
        followers: updated.followers.length,
        following: updated.following.length,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};