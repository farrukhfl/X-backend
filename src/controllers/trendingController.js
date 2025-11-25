const Tweet = require("../models/Tweet");

exports.getTrendingTweets = async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 1); // last 24 hours

    // Fetch recent tweets
    const recentTweets = await Tweet.find({ createdAt: { $gte: since } });

    // Compute a "trending score" for each tweet
    const tweetsWithScore = recentTweets.map(tweet => {
      const score =
        tweet.likes.length * 2 +  // weight likes
        tweet.retweets.length * 3 + // weight retweets more
        tweet.replies.length;      // replies weight 1

      return { tweet, score };
    });

    // Sort descending by score
    tweetsWithScore.sort((a, b) => b.score - a.score);

    // Take top 20 trending
    const topTrending = tweetsWithScore.slice(0, 20).map(item => {
      return {
        _id: item.tweet._id,
        text: item.tweet.text,
        author: item.tweet.author,
        likesCount: item.tweet.likes.length,
        retweetsCount: item.tweet.retweets.length,
        repliesCount: item.tweet.replies.length,
        trendingScore: item.score
      };
    });

    res.status(200).json({
      success: true,
      trendingCount: topTrending.length,
      tweets: topTrending
    });

  } catch (err) {
    console.error("getTrendingTweets error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
