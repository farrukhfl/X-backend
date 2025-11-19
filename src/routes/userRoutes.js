const express = require("express");
const auth = require("../middlewares/auth");
const {
  getMyProfile,
  getUserByUsername,
  updateProfile,
  changePassword,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  isFollowing
} = require("../controllers/userController");
const router = express.Router();

router.get("/me", auth, getMyProfile);
router.get("/:username", getUserByUsername);
router.put("/update", auth, updateProfile);
router.put("/change-password", auth, changePassword);


router.post("/:username/follow", auth, followUser);
router.post("/:username/unfollow", auth, unfollowUser);
router.get("/:username/followers", getFollowers);
router.get("/:username/following", getFollowing);
router.get("/:username/is-following", auth, isFollowing);

module.exports = router;
