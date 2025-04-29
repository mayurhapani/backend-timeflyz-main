const express = require("express");
const router = express.Router();
const {
  login,
  logout,
  forgotPassword,
  verifyOtp,
  setForgotPassword,
  resetPassword,
  sendEmailVerificationMail,
  verifyEmail,
  registerFcmToken,
} = require("../../controllers/v1/auth/auth.controller");

// Middleware
const isAuth = require("../../middleware/isAuth.middleware");

// ✅ User login route
router.post("/login", login);

// ✅ User logout route + remove fcm token // 💛 test pending
router.post("/logout", isAuth, logout);

// ✅ password and verify email routes
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/set-forgot-password", setForgotPassword);

// ✅ reset password route
router.post("/reset-password", isAuth, resetPassword);

// ✅ send email verification link on user email
router.post("/sendEmailVerificationMail", isAuth, sendEmailVerificationMail);

// ✅ verify email route
router.post("/verify-email", isAuth, verifyEmail);

// ✅ Endpoints to register FCM tokens // 💛 test pending
router.post("/registerFcmToken", isAuth, registerFcmToken);

module.exports = router;
