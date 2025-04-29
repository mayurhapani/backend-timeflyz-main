const mongoose = require("mongoose");

const roomCategorySchema = new mongoose.Schema(
  {
    name: String,
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// roomCategorySchema.virtual("hotelDetails", {
//   ref: "Hotel",
//   localField: "hotelId",
//   foreignField: "_id",
//   justOne: true,
// });

const roomCategoryModel = mongoose.model("RoomCategory", roomCategorySchema);

module.exports = roomCategoryModel;
