const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    masterRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterRoom",
      required: true,
    },
    subRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubRoom",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    manualSlots: [
      {
        startTime: Date,
        endTime: Date,
        price: Number,
        isAvailable: { type: Boolean, default: true },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for hotel details
slotSchema.virtual("hotelDetails", {
  ref: "Hotel",
  localField: "hotelId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for master room details
slotSchema.virtual("masterRoomDetails", {
  ref: "MasterRoom",
  localField: "masterRoomId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for sub room details
slotSchema.virtual("subRoomDetails", {
  ref: "SubRoom",
  localField: "subRoomId",
  foreignField: "_id",
  justOne: true,
});

const slotModel = mongoose.model("Slot", slotSchema);

module.exports = slotModel;
