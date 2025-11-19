const express = require("express");
const auth = require("../middlewares/auth");
const {
  getMyProfile,
  getUserByUsername,
  updateProfile,
} = require("../controllers/userController");
const { changePassword } = require("../controllers/userController");
const router = express.Router();

router.get("/me", auth, getMyProfile);
router.get("/:username", getUserByUsername);
router.put("/update", auth, updateProfile);
router.put("/change-password", auth, changePassword);

module.exports = router;
