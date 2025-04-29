const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel" },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    replyByHotel: String,
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reviewSchema.virtual("customerDetails", {
  ref: "Customer",
  localField: "customerId",
  foreignField: "_id",
  justOne: true,
});

reviewSchema.virtual("hotelDetails", {
  ref: "Hotel",
  localField: "hotelId",
  foreignField: "_id",
  justOne: true,
});

const reviewModel = mongoose.model("Review", reviewSchema);

module.exports = reviewModel;
