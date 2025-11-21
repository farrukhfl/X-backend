const mongoose = require("mongoose");

const tweetSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
      maxlength: 280, // like Twitter
    },

    // optional media (image/video URL)
    media: { type: String },

    // likes, retweets
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    retweets: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // parent tweet for replies or retweets
    parentTweet: { type: mongoose.Schema.Types.ObjectId, ref: "Tweet" },
    quotedTweet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tweet", tweetSchema);
