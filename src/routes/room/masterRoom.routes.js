const express = require("express");
const router = express.Router();
const {
  createMasterRoom,
  getAllMasterRooms,
  getMasterRoom,
  updateMasterRoom,
  deleteMasterRoom,
} = require("../../controllers/v1/room/room.controller");
const isSuperAdmin = require("../../middleware/isSuperAdmin.middleware");
const isManager = require("../../middleware/isManager.middleware");

// Create Master Room
router.post("/create", isManager, createMasterRoom);

// Get single Room
router.get("/get/:id", isManager, getMasterRoom);

// Update Room
router.put("/update/:id", isManager, updateMasterRoom);

// Delete Rooms (multiple delete)
router.delete("/delete/:ids", isSuperAdmin, deleteMasterRoom);

// Get all Rooms with pagination
router.get("/getAll", getAllMasterRooms);

module.exports = router;
