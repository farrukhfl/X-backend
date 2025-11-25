const Tweet = require("../models/Tweet");

exports.getUserAnalytics = async (req, res) => {
  try {
    const userId = req.params.userId;

    // 1) Fetch all tweets of this user
    const tweets = await Tweet.find({ author: userId });

    if (!tweets.length) {
      return res.status(200).json({
        success: true,
        analytics: {
          totalTweets: 0,
          totalLikes: 0,
          totalRetweets: 0,
          totalReplies: 0,
          mostPopularTweet: null,
          tweetEngagement: []
        }
      });
    }

    // 2) Calculate totals
    let totalLikes = 0;
    let totalRetweets = 0;
    let totalReplies = 0;

    const tweetEngagement = tweets.map(tweet => {
      const likes = tweet.likes.length;
      const retweets = tweet.retweets.length;
      const replies = tweet.replies.length;

      totalLikes += likes;
      totalRetweets += retweets;
      totalReplies += replies;

      const score = likes * 2 + retweets * 3 + replies;

      return {
        tweetId: tweet._id,
        text: tweet.text,
        likes,
        retweets,
        replies,
        engagementScore: score
      };
    });

    // 3) Find most popular tweet
    const mostPopularTweet = tweetEngagement.sort(
      (a, b) => b.engagementScore - a.engagementScore
    )[0];

    // 4) Final analytics response
    res.status(200).json({
      success: true,
      analytics: {
        totalTweets: tweets.length,
        totalLikes,
        totalRetweets,
        totalReplies,
        mostPopularTweet,
        tweetEngagement
      }
    });

  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
