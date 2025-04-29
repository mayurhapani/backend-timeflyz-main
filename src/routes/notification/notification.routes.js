const express = require("express");
const router = express.Router();
const {
  getAllNotifications,
  deleteNotification,
} = require("../../controllers/v1/notification/notification.controller");

// ✅ Delete Notification (multiple delete)
router.delete("/delete/:ids", deleteNotification);

// ✅ Get all Notifications with pagination
router.get("/getAll", getAllNotifications);

module.exports = router;
