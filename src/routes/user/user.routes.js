const express = require("express");
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
} = require("../../controllers/v1/user/user.controller");
const isAdmin = require("../../middleware/isAdmin.middleware");
const isSuperAdmin = require("../../middleware/isSuperAdmin.middleware");
const isAuth = require("../../middleware/isAuth.middleware");

// Create user
router.post("/create", isAdmin, createUser);

// Get single user
router.get("/get/:id", getUser);

// Update user
router.put("/update/:id", updateUser);

// Delete user (multiple delete)
router.delete("/delete/:ids", isSuperAdmin, deleteUser);

// Get all users with pagination
router.get("/getAll", isAdmin, getAllUsers);

module.exports = router;
