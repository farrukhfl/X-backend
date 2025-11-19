const express = require("express");
const auth = require("../middlewares/auth");
const {
  getMyProfile,
  getUserByUsername,
  updateProfile,
} = require("../controllers/userController");
const router = express.Router();

router.get("/me", auth, getMyProfile);
router.get("/:username", getUserByUsername);
router.put("/update", auth, updateProfile);
module.exports = router;
