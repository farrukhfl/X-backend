const Tweet = require("../models/Tweet");
const User = require("../models/User");

exports.createTweet = async (req, res) => {
  try {
    const userId = req.user._id;
    const { content, media } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Tweet content is required" });
    }

    if (content.length > 280) {
      return res.status(400).json({ success: false, message: "Tweet cannot exceed 280 characters" });
    }

    const tweet = await Tweet.create({
      author: userId,
      content: content.trim(),
      media: media || undefined,
    });

    // Populate author info
    await tweet.populate("author", "username name avatar");

    res.status(201).json({ success: true, tweet });
  } catch (err) {
    console.error("createTweet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



exports.getUserTweets = async (req, res) => {
  try {
    const { username } = req.params;
    let { page = 1, limit = 20 } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(100, Math.max(1, parseInt(limit)));

    // Find user by username
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Count total tweets
    const total = await Tweet.countDocuments({ author: user._id });

    // Fetch tweets with pagination
    const tweets = await Tweet.find({ author: user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "username name avatar");

    res.json({
      success: true,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      tweets,
    });
  } catch (err) {
    console.error("getUserTweets error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



exports.getFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    let { page = 1, limit = 20 } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(100, Math.max(1, parseInt(limit)));

    // Fetch current user to get following list
    const user = await User.findById(userId).select("following");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Fetch tweets from users the current user is following + own tweets
    const authors = [userId, ...user.following]; // include own tweets

    const total = await Tweet.countDocuments({ author: { $in: authors } });

    const tweets = await Tweet.find({ author: { $in: authors } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "username name avatar");

    res.json({
      success: true,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      tweets,
    });
  } catch (err) {
    console.error("getFeed error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



exports.likeTweet = async (req, res) => {
  try {
    const userId = req.user._id;
    const tweetId = req.params.id;

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      return res.status(404).json({ success: false, message: "Tweet not found" });
    }

    const alreadyLiked = tweet.likes.includes(userId);

    if (alreadyLiked) {
      // Unlike
      tweet.likes.pull(userId);
    } else {
      // Like
      tweet.likes.push(userId);
    }

    await tweet.save();
    await tweet.populate("author", "username name avatar");

    res.json({ success: true, tweet });
  } catch (err) {
    console.error("likeTweet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
