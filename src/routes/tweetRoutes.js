const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const { createTweet, getUserTweets, getFeed, likeTweet, retweet, replyTweet, deleteTweet, toggleRetweet, getTweetById, getUserTweets, getRepliesForTweet } = require("../controllers/tweetController");

// POST /api/tweets
router.post("/", auth, createTweet);
// GET /api/tweets/:username
router.get("/:username", getUserTweets);
// GET /api/tweets/feed
router.get("/feed", auth, getFeed);
// PUT /api/tweets/:id/like
router.put("/:id/like", auth, likeTweet);
// POST /api/tweets/:id/retweet
router.post("/:id/retweet", auth, retweet);
// POST /api/tweets/:id/reply
router.post("/:id/reply", auth, replyTweet);
router.delete("/:id", auth, deleteTweet);
router.post("/:id/retweet", auth, toggleRetweet);
router.get("/:id", auth, getTweetById);

router.get("/user/:userId", auth, getUserTweets);
router.get("/:id/replies", auth, getRepliesForTweet);




module.exports = router;
