const mongoose = require("mongoose");

const fcmTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    fcmToken: {
      type: String,
      required: [true, "Please provide a fcm token"],
      trim: true,
    },
    os: {
      type: String,
      required: [true, "Please provide an os"],
      enum: ["android", "ios"],
    },
    deviceId: {
      type: String,
      required: [true, "Please provide a device id"],
      trim: true,
    },
    // createdAt: {
    //   type: Date,
    //   default: Date.now,
    //   expires: 60 * 60 * 24 * 30, // 30 days
    // },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

fcmTokenSchema.virtual("userDetails", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

const fcmTokenModel = mongoose.model("FcmToken", fcmTokenSchema);

module.exports = fcmTokenModel;
