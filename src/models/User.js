const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    bio: {
      type: String,
      maxlength: 160,
      default: "",
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    avatar: {
      type: String,
      default: "", // later we can integrate cloudinary / s3
    },

    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    retweets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tweet" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
