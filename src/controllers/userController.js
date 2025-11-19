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


exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both currentPassword and newPassword are required",
      });
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      return res.status(400).json({
        success: false,
        message: "New password must be 8–72 characters",
      });
    }

    // get user with password
    const user = await User.findById(userId).select("+password");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid current password",
      });
    }

    // hash and update
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("changePassword error:", err);
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



/**
 * Follow a user
 * POST /api/user/:username/follow
 * Auth required
 */
exports.followUser = async (req, res) => {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const fromUserId = req.user._id; // the follower
    const { username } = req.params;

    // validate target
    const toUser = await User.findOne({ username: username.toLowerCase() });
    if (!toUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (toUser._id.equals(fromUserId)) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself" });
    }

    // If transactions available, use them
    if (session) {
      session.startTransaction();
      try {
        // add to following of current user
        const fromUpdate = await User.findByIdAndUpdate(
          fromUserId,
          { $addToSet: { following: toUser._id }, $inc: { followingCount: 1 } },
          { new: true, session }
        );

        // add to followers of target user
        const toUpdate = await User.findByIdAndUpdate(
          toUser._id,
          { $addToSet: { followers: fromUserId }, $inc: { followersCount: 1 } },
          { new: true, session }
        );

        // If addToSet didn't actually add (already following), we need to detect and fix counts
        // Find if follower was added by checking presence
        const alreadyFollowing = toUpdate.followers.some(id => id.equals(fromUserId));
        // Because we used addToSet above, counts might have been incorrectly incremented if already present.
        // To be safe, re-calc counts in transaction (Safer but heavier):
        await User.findByIdAndUpdate(fromUserId, { $set: { followingCount: fromUpdate.following.length } }, { session });
        await User.findByIdAndUpdate(toUser._id, { $set: { followersCount: toUpdate.followers.length } }, { session });

        await session.commitTransaction();
        session.endSession();

        return res.json({ success: true, message: "Followed user", user: { id: toUpdate._id, username: toUpdate.username } });
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    }

    // Fallback (no transactions): do updates in sequence but be defensive
    // Add to current user's following
    const fromUpdateNoTx = await User.findByIdAndUpdate(
      fromUserId,
      { $addToSet: { following: toUser._id } },
      { new: true }
    );

    // Add to target user's followers
    const toUpdateNoTx = await User.findByIdAndUpdate(
      toUser._id,
      { $addToSet: { followers: fromUserId } },
      { new: true }
    );

    // Recalculate counts (safe)
    await User.findByIdAndUpdate(fromUserId, { $set: { followingCount: fromUpdateNoTx.following.length } });
    await User.findByIdAndUpdate(toUser._id, { $set: { followersCount: toUpdateNoTx.followers.length } });

    return res.json({ success: true, message: "Followed user", user: { id: toUpdateNoTx._id, username: toUpdateNoTx.username } });

  } catch (err) {
    console.error("followUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Unfollow a user
 * POST /api/user/:username/unfollow
 * Auth required
 */
exports.unfollowUser = async (req, res) => {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const fromUserId = req.user._id;
    const { username } = req.params;

    const toUser = await User.findOne({ username: username.toLowerCase() });
    if (!toUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (toUser._id.equals(fromUserId)) {
      return res.status(400).json({ success: false, message: "You cannot unfollow yourself" });
    }

    if (session) {
      session.startTransaction();
      try {
        const fromUpdate = await User.findByIdAndUpdate(
          fromUserId,
          { $pull: { following: toUser._id } },
          { new: true, session }
        );
        const toUpdate = await User.findByIdAndUpdate(
          toUser._id,
          { $pull: { followers: fromUserId } },
          { new: true, session }
        );

        // Recalculate counts in transaction for safety
        await User.findByIdAndUpdate(fromUserId, { $set: { followingCount: fromUpdate.following.length } }, { session });
        await User.findByIdAndUpdate(toUser._id, { $set: { followersCount: toUpdate.followers.length } }, { session });

        await session.commitTransaction();
        session.endSession();

        return res.json({ success: true, message: "Unfollowed user" });
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    }

    // Fallback without transactions
    const fromUpdateNoTx = await User.findByIdAndUpdate(
      fromUserId,
      { $pull: { following: toUser._id } },
      { new: true }
    );
    const toUpdateNoTx = await User.findByIdAndUpdate(
      toUser._id,
      { $pull: { followers: fromUserId } },
      { new: true }
    );

    await User.findByIdAndUpdate(fromUserId, { $set: { followingCount: fromUpdateNoTx.following.length } });
    await User.findByIdAndUpdate(toUser._id, { $set: { followersCount: toUpdateNoTx.followers.length } });

    return res.json({ success: true, message: "Unfollowed user" });

  } catch (err) {
    console.error("unfollowUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get followers list
 * GET /api/user/:username/followers?page=1&limit=20
 * Public endpoint
 */
exports.getFollowers = async (req, res) => {
  try {
    const { username } = req.params;
    let { page = 1, limit = 20 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.min(100, Math.max(1, parseInt(limit)));

    const user = await User.findOne({ username: username.toLowerCase() }).select("followers followersCount username");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Paginate followers IDs, then populate
    const start = (page - 1) * limit;
    const end = start + limit;

    const slice = user.followers.slice(start, end); // this is safe but note: large arrays in doc might be heavy
    const followers = await User.find({ _id: { $in: slice } }).select("name username avatar");

    return res.json({
      success: true,
      meta: {
        total: user.followersCount ?? user.followers.length,
        page,
        limit,
      },
      followers,
    });
  } catch (err) {
    console.error("getFollowers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get following list
 * GET /api/user/:username/following?page=1&limit=20
 */
exports.getFollowing = async (req, res) => {
  try {
    const { username } = req.params;
    let { page = 1, limit = 20 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.min(100, Math.max(1, parseInt(limit)));

    const user = await User.findOne({ username: username.toLowerCase() }).select("following followingCount username");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const slice = user.following.slice(start, end);
    const following = await User.find({ _id: { $in: slice } }).select("name username avatar");

    return res.json({
      success: true,
      meta: {
        total: user.followingCount ?? user.following.length,
        page,
        limit,
      },
      following,
    });
  } catch (err) {
    console.error("getFollowing error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Check if the authenticated user is following a given username
 * GET /api/user/:username/is-following
 * Auth required (makes sense to check for current user)
 */
exports.isFollowing = async (req, res) => {
  try {
    const currentUserId = req.user?._id;
    const { username } = req.params;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findOne({ username: username.toLowerCase() }).select("followers");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const following = user.followers.some(id => id.equals(currentUserId));

    return res.json({ success: true, following });
  } catch (err) {
    console.error("isFollowing error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
