const express = require("express");
const   router = express.Router();
const {
  createSlot,
  getAllSlots,
  getSlot,
  updateSlot,
  deleteSlot,
} = require("../../controllers/v1/slot/slot.controller");
const isManager = require("../../middleware/isManager.middleware");
const isSuperAdmin = require("../../middleware/isSuperAdmin.middleware");

// Create Slot
router.post("/create", isManager, createSlot);

// Get single Slot
router.get("/get/:id", isManager, getSlot);

// Update Slot
router.put("/update/:id", isManager, updateSlot);

// Delete Slots (multiple delete)
router.delete("/delete/:ids", isSuperAdmin, deleteSlot);

// Get all Slots with pagination
router.get("/getAll", getAllSlots);

module.exports = router;
