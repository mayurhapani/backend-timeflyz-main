const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: String,
    otp: String,
  },
  { timestamps: true }
);

const otpModel = mongoose.model("Otp", otpSchema);

module.exports = otpModel;
