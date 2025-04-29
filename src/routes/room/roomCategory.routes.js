const express = require("express");
const router = express.Router();
const {
  createRoomCategory,
  getAllRoomCategories,
  getRoomCategoryById,
  updateRoomCategory,
  deleteRoomCategory,
} = require("../../controllers/v1/room/roomCategory.controller");

// Create Room Category
router.post("/create", createRoomCategory);

// get room category by id
router.get("/getById/:id", getRoomCategoryById);

// Update Room Category
router.put("/update/:id", updateRoomCategory);

// Delete Room Categorys (multiple delete)
router.delete("/delete/:ids", deleteRoomCategory);

// Get all Room Categories with pagination
router.get("/getAll", getAllRoomCategories);

module.exports = router;
