const mongoose = require("mongoose");

const hotelAmenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const hotelAmenityModel = mongoose.model("HotelAmenity", hotelAmenitySchema);

module.exports = hotelAmenityModel;
