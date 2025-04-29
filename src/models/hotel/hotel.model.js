const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    country: { type: String, required: true },
    pincode: String,
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    images: [String],
    amenitiesId: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotelAmenity" }],
    rating: { type: Number, default: 0 }, // average rating
    totalReviews: { type: Number, default: 0 },
    website: String,
    contactNumber: { type: String, required: true },
    email: { type: String, required: true },

    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Create a geospatial index for location-based queries
hotelSchema.index({ location: "2dsphere" });

// Create a text index for search queries
hotelSchema.index({ name: 1, pincode: 1 });

hotelSchema.virtual("adminDetails", {
  ref: "User",
  localField: "adminId",
  foreignField: "_id",
  justOne: true,
});

hotelSchema.virtual("managerDetails", {
  ref: "User",
  localField: "managers",
  foreignField: "_id",
  justOne: false,
});

hotelSchema.virtual("amenitiesDetails", {
  ref: "HotelAmenity",
  localField: "amenitiesId",
  foreignField: "_id",
  justOne: false,
});

const hotelModel = mongoose.model("Hotel", hotelSchema);

module.exports = hotelModel;
