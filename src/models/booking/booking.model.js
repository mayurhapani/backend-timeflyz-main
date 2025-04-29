const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel" },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    slotPrice: {
      type: Number,
      required: true,
    },
    slotDuration: {
      type: Number,
      required: true,
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    guests: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["online", "card", "cash"],
      default: "online",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paymentIntentId: {
      type: String,
      default: null,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    bookingStatus: {
      type: String,
      enum: ["booked", "cancelled", "completed", "pending"],
      default: "pending",
    },
    specialRequests: String,
    cancellationRequest: {
      requested: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", null],
        default: null,
      },
      message: { type: String, default: "" },
      requestedAt: { type: Date, default: null },
      respondedAt: { type: Date, default: null },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

bookingSchema.virtual("customerDetails", {
  ref: "Customer",
  localField: "customerId",
  foreignField: "_id",
  justOne: true,
});
bookingSchema.virtual("hotelDetails", {
  ref: "Hotel",
  localField: "hotelId",
  foreignField: "_id",
  justOne: true,
});

const bookingModel = mongoose.model("Booking", bookingSchema);

module.exports = bookingModel;
