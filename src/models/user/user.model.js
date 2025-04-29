const mongoose = require("mongoose");
const md5 = require("md5");
require("dotenv").config();

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    role: {
      type: String,
      enum: ["superAdmin", "admin", "manager", "supportAgent"],
      required: [true, "Please provide a role"],
      default: "manager",
    },
    phone: {
      type: String,
      trim: true,
    },
    profilePic: {
      type: String,
      default: "https://t3.ftcdn.net/jpg/00/60/49/78/360_F_60497872_vWp6ylFWjHQrTTYFwYuOD3XAHX2jWThH.jpg",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    supportAgentStatus: {
      type: String,
      enum: ["available", "busy", "occupied", "offline", null],
      default: null,
    },
    hotelId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
      },
    ],
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isChainAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Encrypt password using MD5 before saving
userSchema.pre("save", function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // Create MD5 hash of the password with salt from environment variable
  this.password = md5(this.password + process.env.PASSWORD_SALT);

  next();
});

const userModel = mongoose.model("User", userSchema);

module.exports = userModel;
