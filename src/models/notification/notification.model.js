const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "receiverModel", // 👈 dynamic reference
    },
    receiverModel: {
      type: String,
      required: true,
      enum: ["User", "Customer", "Hotel"], // 👈 models this can refer to
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "senderModel", // 👈 dynamic reference
    },
    isDeleted: { type: Boolean, default: false },
    senderModel: {
      type: String,
      required: true,
      enum: ["User", "Customer", "Hotel"], // 👈 models this can refer to
    },
    message: String,
    type: {
      type: String,
      enum: [
        "newBookingRequest",
        "bookingConfirmation",
        "newBookingCancellation",
        "bookingCancellation",
        "bookingPayment",
        "bookingCheckIn",
        "bookingCheckOut",
      ],
      default: "bookingStatusUpdate",
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

notificationSchema.virtual("receiverDetails", {
  refPath: "receiverModel",
  localField: "receiverId",
  foreignField: "_id",
  justOne: true,
});

notificationSchema.virtual("senderDetails", {
  refPath: "senderModel",
  localField: "senderId",
  foreignField: "_id",
  justOne: true,
});

const notificationModel = mongoose.model("Notification", notificationSchema);

module.exports = notificationModel;
