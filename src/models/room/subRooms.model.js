const mongoose = require("mongoose");

const subRoomSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel" },
    masterRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterRoom",
    },
    subRoomName: { type: String, required: true, trim: true },

    defaultSlots: [
      {
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        price: { type: Number, required: true },
        isAvailable: { type: Boolean, default: true },
      },
    ],
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    slotDuration: {
      type: Number,
      enum: [3, 6, 12],
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

subRoomSchema.virtual("hotelDetails", {
  ref: "Hotel",
  localField: "hotelId",
  foreignField: "_id",
  justOne: true,
});

subRoomSchema.virtual("masterRoomDetails", {
  ref: "MasterRoom",
  localField: "masterRoomId",
  foreignField: "_id",
  justOne: true,
});

const subRoomModel = mongoose.model("SubRoom", subRoomSchema);

module.exports = subRoomModel;
