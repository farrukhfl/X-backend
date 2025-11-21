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


exports.retweet = async (req, res) => {
  try {
    const userId = req.user._id;
    const tweetId = req.params.id;
    const { content } = req.body; // optional quote

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      return res.status(404).json({ success: false, message: "Tweet not found" });
    }

    if (content && content.trim().length > 0) {
      // Quote Tweet → create new tweet with parentTweet
      const quoteTweet = await Tweet.create({
        author: userId,
        content: content.trim(),
        parentTweet: tweetId,
      });

      await quoteTweet.populate("author", "username name avatar");
      return res.status(201).json({ success: true, tweet: quoteTweet });
    }

    // Simple Retweet → toggle user in retweets array
    const alreadyRetweeted = tweet.retweets.includes(userId);

    if (alreadyRetweeted) {
      tweet.retweets.pull(userId);
    } else {
      tweet.retweets.push(userId);
    }

    await tweet.save();
    await tweet.populate("author", "username name avatar");

    res.json({ success: true, tweet });
  } catch (err) {
    console.error("retweet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.replyTweet = async (req, res) => {
  try {
    const userId = req.user._id;
    const tweetId = req.params.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Reply content is required" });
    }

    if (content.length > 280) {
      return res.status(400).json({ success: false, message: "Reply cannot exceed 280 characters" });
    }

    const parentTweet = await Tweet.findById(tweetId);
    if (!parentTweet) {
      return res.status(404).json({ success: false, message: "Original tweet not found" });
    }

    const replyTweet = await Tweet.create({
      author: userId,
      content: content.trim(),
      parentTweet: tweetId,
    });

    await replyTweet.populate("author", "username name avatar");

    res.status(201).json({ success: true, tweet: replyTweet });
  } catch (err) {
    console.error("replyTweet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteTweet = async (req, res) => {
  try {
    const tweetId = req.params.id;
    const userId = req.user._id;

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
      return res.status(404).json({ success: false, message: "Tweet not found" });
    }

    // Only tweet creator can delete
    if (tweet.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this tweet" });
    }

    // Delete the tweet
    await Tweet.deleteOne({ _id: tweetId });

    res.status(200).json({
      success: true,
      message: "Tweet deleted successfully"
    });

  } catch (err) {
    console.error("deleteTweet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.toggleRetweet = async (req, res) => {
  try {
    const tweetId = req.params.id;
    const userId = req.user._id;

    const tweet = await Tweet.findById(tweetId);
    const user = await User.findById(userId);

    if (!tweet) {
      return res.status(404).json({ success: false, message: "Tweet not found" });
    }

    // Check if user already retweeted
    const hasRetweeted = tweet.retweets.includes(userId);

    if (hasRetweeted) {
      // Undo Retweet
      tweet.retweets = tweet.retweets.filter(id => id.toString() !== userId.toString());
      user.retweets = user.retweets.filter(id => id.toString() !== tweetId.toString());

      await tweet.save();
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Retweet removed",
        retweeted: false,
        retweetCount: tweet.retweets.length
      });
    }

    // Add Retweet
    tweet.retweets.push(userId);
    user.retweets.push(tweetId);

    await tweet.save();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Retweeted successfully",
      retweeted: true,
      retweetCount: tweet.retweets.length
    });

  } catch (err) {
    console.error("toggleRetweet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getTweetById = async (req, res) => {
  try {
    const tweetId = req.params.id;
    const userId = req.user._id; // logged-in user

    // Populate tweet with author details
    const tweet = await Tweet.findById(tweetId)
      .populate("author", "_id name avatar")
      .populate("replies", "_id author text createdAt");

    if (!tweet) {
      return res.status(404).json({
        success: false,
        message: "Tweet not found",
      });
    }

    // Check if current user liked this tweet
    const liked = tweet.likes.includes(userId);

    // Check if current user retweeted this tweet
    const retweeted = tweet.retweets.includes(userId);

    res.status(200).json({
      success: true,
      tweet: {
        _id: tweet._id,
        author: tweet.author,
        text: tweet.text,
        image: tweet.image,

        createdAt: tweet.createdAt,
        updatedAt: tweet.updatedAt,

        // engagement info
        likesCount: tweet.likes.length,
        retweetsCount: tweet.retweets.length,
        repliesCount: tweet.replies.length,

        liked,
        retweeted,
      },
    });

  } catch (err) {
    console.error("getTweetById error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


exports.getUserTweets = async (req, res) => {
  try {
    const profileUserId = req.params.userId;   // Whose profile we are viewing
    const currentUserId = req.user._id;       // Logged-in user

    // Get all tweets by that user
    const tweets = await Tweet.find({ author: profileUserId })
      .populate("author", "_id name avatar")
      .sort({ createdAt: -1 });

    const formattedTweets = tweets.map(tweet => {
      return {
        _id: tweet._id,
        author: tweet.author,
        text: tweet.text,
        image: tweet.image,

        createdAt: tweet.createdAt,

        likesCount: tweet.likes.length,
        retweetsCount: tweet.retweets.length,
        repliesCount: tweet.replies.length,

        liked: tweet.likes.includes(currentUserId),
        retweeted: tweet.retweets.includes(currentUserId)
      };
    });

    res.status(200).json({
      success: true,
      tweets: formattedTweets
    });

  } catch (err) {
    console.error("getUserTweets error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



exports.getRepliesForTweet = async (req, res) => {
  try {
    const tweetId = req.params.id;
    const currentUserId = req.user._id;

    // Get original tweet and populate replies
    const parentTweet = await Tweet.findById(tweetId)
      .populate({
        path: "replies",
        populate: { path: "author", select: "_id name avatar" },
        options: { sort: { createdAt: -1 } } // newest first
      });

    if (!parentTweet) {
      return res.status(404).json({
        success: false,
        message: "Tweet not found"
      });
    }

    // Format each reply
    const formattedReplies = parentTweet.replies.map(reply => {
      return {
        _id: reply._id,
        author: reply.author,
        text: reply.text,
        image: reply.image,
        createdAt: reply.createdAt,

        likesCount: reply.likes.length,
        retweetsCount: reply.retweets.length,
        repliesCount: reply.replies.length,

        liked: reply.likes.includes(currentUserId),
        retweeted: reply.retweets.includes(currentUserId)
      };
    });

    res.status(200).json({
      success: true,
      parentTweetId: tweetId,
      totalReplies: formattedReplies.length,
      replies: formattedReplies
    });

  } catch (err) {
    console.error("getRepliesForTweet error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.quoteTweet = async (req, res) => {
  try {
    const originalTweetId = req.params.id;
    const { text } = req.body;
    const userId = req.user._id;

    // Check required text
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Quote tweet must contain text" });
    }

    // Check original tweet exists
    const originalTweet = await Tweet.findById(originalTweetId);
    if (!originalTweet) {
      return res.status(404).json({ message: "Tweet not found" });
    }

    // Create new quote tweet
    const newQuoteTweet = await Tweet.create({
      user: userId,
      text,
      quotedTweet: originalTweetId
    });

    return res.status(201).json({
      message: "Tweet quoted successfully",
      tweet: newQuoteTweet
    });

  } catch (error) {
    console.error("Quote tweet error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getTimelineFeed = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get logged-in user
    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Combine following users + self
    const usersToFetch = [...currentUser.following, currentUserId];

    // Fetch tweets from these users
    const tweets = await Tweet.find({ author: { $in: usersToFetch } })
      .populate("author", "_id name avatar username")
      .sort({ createdAt: -1 }) // newest first
      .limit(50); // limit for now

    // Format tweets
    const formattedTweets = tweets.map(tweet => ({
      _id: tweet._id,
      author: tweet.author,
      text: tweet.text,
      image: tweet.image,
      createdAt: tweet.createdAt,

      likesCount: tweet.likes.length,
      retweetsCount: tweet.retweets.length,
      repliesCount: tweet.replies.length,

      liked: tweet.likes.includes(currentUserId),
      retweeted: tweet.retweets.includes(currentUserId)
    }));

    res.status(200).json({
      success: true,
      feedCount: formattedTweets.length,
      tweets: formattedTweets
    });

  } catch (err) {
    console.error("getTimelineFeed error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
