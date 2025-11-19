const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const { createTweet } = require("../controllers/tweetController");

// POST /api/tweets
router.post("/", auth, createTweet);
// GET /api/tweets/:username
router.get("/:username", getUserTweets);
// GET /api/tweets/feed
router.get("/feed", auth, getFeed);
// PUT /api/tweets/:id/like
router.put("/:id/like", auth, likeTweet);



module.exports = router;
