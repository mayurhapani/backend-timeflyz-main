const mongoose = require("mongoose");
const md5 = require("md5");
require("dotenv").config();

const customerSchema = new mongoose.Schema(
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
    role: {
      type: String,
      default: "customer",
      enum: ["customer"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
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
    searchHistory: [
      {
        query: String,
        city: String,
        date: { type: Date, default: Date.now },
      },
    ],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hotel" }],
    bookingHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
    reviewsGiven: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Encrypt password using MD5 before saving
customerSchema.pre("save", function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // Create MD5 hash of the password with salt from environment variable
  this.password = md5(this.password + process.env.PASSWORD_SALT);

  next();
});

const customerModel = mongoose.model("Customer", customerSchema);

module.exports = customerModel;
