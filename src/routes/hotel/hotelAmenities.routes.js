const express = require("express");
const router = express.Router();

const {
  createHotelAmenity,
  getHotelAmenity,
  updateHotelAmenity,
  deleteHotelAmenity,
  getAllHotelAmenities,
} = require("../../controllers/v1/hotel/hotelAmenities.controller");
const isSuperAdmin = require("../../middleware/isSuperAdmin.middleware");

// ✅ Create Hotel Amenity
router.post("/create", isSuperAdmin, createHotelAmenity);

// ✅ Get Hotel Amenity
router.get("/get/:id", isSuperAdmin, getHotelAmenity);

// ✅ Update Hotel Amenity
router.put("/update/:id", isSuperAdmin, updateHotelAmenity);

// ✅ Delete Hotel Amenities (multiple delete)
router.delete("/delete/:ids", isSuperAdmin, deleteHotelAmenity);

// ✅ Get All Hotel Amenities
router.get("/getAll", getAllHotelAmenities);

module.exports = router;
