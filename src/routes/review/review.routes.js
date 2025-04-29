const express = require("express");
const router = express.Router();
const {
  createReview,
  getAllReviews,
  getReview,
  updateReview,
  deleteReview,
} = require("../../controllers/v1/review/review.controller");
const isSuperAdmin = require("../../middleware/isSuperAdmin.middleware");
const isAuth = require("../../middleware/isAuth.middleware");

// Create Review
router.post("/create", isAuth, createReview);

// Get single Review
router.get("/get/:id", isAuth, getReview);

// Update Review
router.put("/update/:id", isAuth, updateReview);

// Delete Review (multiple delete)
router.delete("/delete/:ids", isSuperAdmin, deleteReview);

// Get all Reviews with pagination
router.get("/getAll", getAllReviews);

module.exports = router;
