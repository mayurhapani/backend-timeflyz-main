const express = require("express");
const router = express.Router();
const {
  createSubRoom,
  getAllSubRooms,
  getSubRoomById,
  updateSubRoom,
  deleteSubRoom,
} = require("../../controllers/v1/room/room.controller");
const isSuperAdmin = require("../../middleware/isSuperAdmin.middleware");
const isManager = require("../../middleware/isManager.middleware");

// Create Sub Room
router.post("/create", isManager, createSubRoom);

// Get single Sub Room
router.get("/get/:id", isManager, getSubRoomById);

// Update Sub Room
router.put("/update/:id", isManager, updateSubRoom);

// Delete Sub Rooms (multiple delete)
router.delete("/delete/:ids", isSuperAdmin, deleteSubRoom);

// Get all Sub Rooms with pagination
router.get("/getAll", getAllSubRooms);

module.exports = router;
