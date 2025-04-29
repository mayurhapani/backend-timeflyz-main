const mongoose = require("mongoose");

const masterRoomSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel" },
    masterRoomName: { type: String, required: true },
    subRoomIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubRoom",
      },
    ],
    fullDayPrice: { type: Number, required: true },
    description: String,
    images: [String],
    capacity: Number,
    amenities: [String],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

masterRoomSchema.virtual("hotelDetails", {
  ref: "Hotel",
  localField: "hotelId",
  foreignField: "_id",
  justOne: true,
});

const masterRoomModel = mongoose.model("MasterRoom", masterRoomSchema);

module.exports = masterRoomModel;
