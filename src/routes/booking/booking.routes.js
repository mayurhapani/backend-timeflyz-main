const express = require("express");
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  requestBookingCancellation,
  respondToCancellationRequest,
  bookingConfirmation,
} = require("../../controllers/v1/booking/booking.controller");
const isManager = require("../../middleware/isManager.middleware");
const isSuperAdmin = require("../../middleware/isSuperAdmin.middleware");

// 💛 Create Booking
// 💛 payment api panding
// 💛 notification test panding
router.post("/create", createBooking);

// 💛 booking confirmation
// 💛 payment api panding for check payment status
// 💛 notification test panding
router.put("/bookingConfirmation/:bookingId", isManager, bookingConfirmation);

// ✅✅ Get single Booking
router.get("/get/:id", getBooking);

// ✅✅ Update Booking
router.put("/update/:id", isManager, updateBooking);

// ✅✅ Delete Bookings (multiple delete)
router.delete("/delete/:ids", isSuperAdmin, deleteBooking);

// ✅✅ Get all Bookings with pagination
router.get("/getAll", getAllBookings);

// ✅ Customer requests to cancel a booking
// 💛 send notification to hotel
router.put("/requestBookingCancellation/:bookingId", requestBookingCancellation);

// ✅ Hotel updates the cancellation request
// 💛 send notification to customer
router.put("/respondToCancellationRequest/:bookingId", isManager, respondToCancellationRequest);

module.exports = router;
