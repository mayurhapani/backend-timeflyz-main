const express = require("express");
const router = express.Router();

const {
  createHotel,
  getAllHotels,
  getHotel,
  updateHotel,
  deleteHotel,
} = require("../../controllers/v1/hotel/hotel.controller");
const isSuperAdmin = require("../../middleware/isSuperAdmin.middleware");
const isAdmin = require("../../middleware/isAdmin.middleware");

// ✅ Create Hotel
router.post("/create", isAdmin, createHotel);

// ✅ Get single Hotel
router.get("/get/:id", getHotel);

// ✅ Update Hotel
router.put("/update/:id", isAdmin, updateHotel);

// ✅ Delete Hotels (multiple delete)
router.delete("/delete/:ids", isSuperAdmin, deleteHotel);

// ✅ Search hotels
router.get("/getAll", getAllHotels);

module.exports = router;
