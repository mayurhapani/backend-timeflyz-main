const express = require("express");
const router = express.Router();

// Import route modules
const userAuthRoutes = require("./auth/auth.routes");
const guestRoutes = require("./guest/guest.routes");
const userRoutes = require("./user/user.routes");
const CustomerRoutes = require("./customer/customer.routes");
const paymentRoutes = require("./payment/payment.routes");

const hotelRoutes = require("./hotel/hotel.routes");
const hotelAmenitiesRoutes = require("./hotel/hotelAmenities.routes");
const masterRoomRoutes = require("./room/masterRoom.routes");
const subRoomRoutes = require("./room/subRoom.routes");
const bookingRoutes = require("./booking/booking.routes");
const slotRoutes = require("./slot/slot.routes");

const reviewRoutes = require("./review/review.routes");
const notificationRoutes = require("./notification/notification.routes");
const supportRoutes = require("./support/support.routes");
const commonRoutes = require("./common/common.routes");

// Middleware
const isAuth = require("../middleware/isAuth.middleware");

// Use route modules

// 💛 email templates panding
// 💛 payment api panding
// 💛 fcm test pending + service account key pending
// 💛 commented few code in firebase.config file
// 💛 detele images and add new images at upadate hotel time

// ✅ User Auth Route // 💛 email templates panding // 💛 fcm test pending
router.use("/userAuth", userAuthRoutes);

// ✅✅ guest route
router.use("/guest", guestRoutes);

// ✅✅ User Routes
router.use("/user", isAuth, userRoutes);

// ✅✅ file upload route
router.use("/common", commonRoutes);

// ✅✅ Customer Routes
router.use("/customer", CustomerRoutes);

// ✅✅ Hotel Routes
router.use("/hotel", isAuth, hotelRoutes);
router.use("/hotelAmenities", isAuth, hotelAmenitiesRoutes);

// ✅✅ Review Routes
router.use("/review", reviewRoutes);

// ✅✅ Room Routes
router.use("/masterRoom", isAuth, masterRoomRoutes);
router.use("/subRoom", isAuth, subRoomRoutes);

// ✅✅ Slot Routes // 💛 may be we have to add sub slots
router.use("/slot", isAuth, slotRoutes);

// ✅✅ Booking Routes // 💛 payment api panding // 💛 notification test panding
router.use("/booking", isAuth, bookingRoutes);

// ✅✅ Support Routes  //💛 notification tasting pending
router.use("/support", isAuth, supportRoutes);

// 💛 payment api
router.use("/payment", paymentRoutes);

// ✅ Notification Routes
router.use("/notification", isAuth, notificationRoutes);

// router.use("/roomCategory", isAuth, roomCategoryRoutes); // ✅

module.exports = router;
