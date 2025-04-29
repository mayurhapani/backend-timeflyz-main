const userModel = require("../../../models/user/user.model");
const jwt = require("jsonwebtoken");
const md5 = require("md5");
const customerModel = require("../../../models/customer/customer.model");
const otpModel = require("../../../models/otp/otp.model");
const { sendMail, sendSms } = require("../../../utils/sendMail");
const fcmTokenModel = require("../../../models/fcmToken/fcmToken.model");

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// ✅ Login
exports.login = async (req, res) => {
  try {
    const { email, password, phone } = req.body;

    // Validate input
    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email or phone and password",
      });
    }

    let user;

    // First, try to find the user in the customer database using email or phone
    if (email || phone) {
      user = await customerModel.findOne({ $or: [{ email }, { phone }] });
    }

    // If not found in customer database, try to find in user database using email only
    if (!user && email) {
      user = await userModel.findOne({ email }).select("+password");
    }

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if user is deleted or inactive
    if (user.isDeleted || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Your account has been deactivated",
      });
    }

    // Check if password matches
    const hashedPassword = md5(password + process.env.PASSWORD_SALT);
    if (hashedPassword !== user.password) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Set cookie options
    const cookieExpireDays = parseInt(process.env.JWT_COOKIE_EXPIRE);
    const cookieOptions = {
      expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    // Send response with cookie
    res.status(200).cookie("token", token, cookieOptions).json({
      success: true,
      token,
      data: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// ✅ Logout + remove fcm token // 💛 test pending
exports.logout = async (req, res) => {
  try {
    const { id } = req.user;
    const { fcmToken, deviceId } = req.body;

    //remove fcm token
    const removedFcmToken = await fcmTokenModel.findOneAndDelete({ userId: id, fcmToken, deviceId });
    console.log("fcm token removed", removedFcmToken);

    res
      .status(200)
      .cookie("token", "none", {
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        httpOnly: true,
      })
      .json({
        success: true,
        message: "Logged out successfully",
      });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// ✅ Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;

    // Validate input
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: "Please provide an email address or phone number",
      });
    }

    // Check if user exists
    let user;
    user = await userModel.findOne({ email });

    if (!user) {
      user = await customerModel.findOne({ $or: [{ email }, { phone }] }); //ckeck phone number too
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Generate reset token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    let response;
    if (email) {
      // Send reset email with dynamic parameters
      response = await sendMail({
        to: email,
        subject: "Reset Password OTP",
        text: `Your OTP for password reset is: ${otp}`,
        html: `
          <p>Hello,</p>
          <p>Your OTP for password reset is: <strong>${otp}</strong></p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Best regards,</p>
          <p>The ${process.env.APP_NAME} Team</p>
        `,
      });
    }

    if (phone) {
      // Send reset sms with dynamic parameters
      response = await sendSms({
        to: phone,
        message: `Your OTP for password reset is: ${otp}`,
      });
    }

    console.log(response);

    // email already sent
    const alreadySent = await otpModel.findOne({ $or: [{ email }, { phone }] });
    if (alreadySent) {
      //update otp
      await otpModel.findOneAndUpdate({ $or: [{ email }, { phone }] }, { otp });
    } else {
      //save otp to database
      await otpModel.create({
        $or: [{ email }, { phone }],
        otp,
      });
    }

    res.status(200).json({
      success: true,
      message: "Otp sent to email or phone",
      response,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// ✅ Verify Otp
exports.verifyOtp = async (req, res) => {
  try {
    const { otp, email, phone } = req.body;

    // Validate input
    if ((!email || !phone) && !otp) {
      return res.status(400).json({
        success: false,
        error: "Please provide an email or phone number and otp",
      });
    }

    //check if user exists
    let user;
    user = await userModel.findOne({ email });

    if (!user) {
      user = await customerModel.findOne({ $or: [{ email }, { phone }] }); //check phone number too
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "User not found",
      });
    }

    const otpData = await otpModel.findOne({ $or: [{ email }, { phone }] });

    //check if user exists
    if (!otpData) {
      return res.status(400).json({
        success: false,
        error: "User not found",
      });
    }

    //check if otp is expired
    if (otpData.updatedAt < Date.now() - 1000 * 60 * 10) {
      return res.status(400).json({
        success: false,
        error: "Otp expired",
      });
    }

    // Check if otp is valid
    const otpDataCheck = await otpModel.findOne({ $or: [{ email }, { phone }], otp });

    if (!otpDataCheck) {
      return res.status(400).json({
        success: false,
        error: "Invalid otp",
      });
    }

    //delete otp from database
    await otpModel.findOneAndDelete({ $or: [{ email }, { phone }] });

    res.status(200).json({
      success: true,
      message: "Otp verified successfully",
    });
  } catch (error) {
    console.error("Verify otp error:", error);
  }
};

// ✅ set forgot password
exports.setForgotPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide an email and password",
      });
    }

    // Check if user exists
    let user;
    user = await userModel.findOne({ email });

    if (!user) {
      user = await customerModel.findOne({ $or: [{ email }, { phone }] }); //check phone number too
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "User not found",
      });
    }

    // Update password
    user.password = md5(password + process.env.PASSWORD_SALT);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Set forgot password error:", error);
  }
};

// ✅ Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.user;
    const { oldPassword, newPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Please provide old password and new password",
      });
    }

    // Check if user exists
    const user = await userModel.findOne({ _id: id });

    // Check if old password matches
    const hashedOldPassword = md5(oldPassword + process.env.PASSWORD_SALT);
    if (hashedOldPassword !== user.password) {
      return res.status(401).json({
        success: false,
        error: "Invalid old password",
      });
    }

    // Update password
    user.password = md5(newPassword + process.env.PASSWORD_SALT);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// ✅ send email verification link
exports.sendEmailVerificationMail = async (req, res) => {
  try {
    const user = req.user;
    const headerToken = req.headers.authorization;

    //remove Bearer from token
    const token = headerToken.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token is required" });
    }

    // Validate input
    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Please provide a token",
      });
    }

    const verificationLink = `${process.env.CORS_ORIGIN}/userAuth/verify-email/?token=${token}`; //💛 create link for verify email

    // Send verification email with dynamic parameters
    const emailResponse = await sendMail({
      to: user.email,
      subject: "Verify Your Email Address",
      text: `Please verify your email by visiting: ${verificationLink}`,
      html: `
        <p>Hello,</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,</p>
        <p>The ${process.env.APP_NAME} Team</p>
      `,
    });

    console.log(emailResponse);

    res.status(200).json({
      success: true,
      message: "Verification email sent",
    });
  } catch (error) {
    console.error("Verification eamil send error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// ✅ Verify Email after click on link
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    // Validate input
    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Please provide a token",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists
    const user = await userModel.findOne({ _id: decoded.id });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Update user's email verification status
    user.isEmailVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// ✅ Function to register an FCM token for push notifications // 💛 test pending
exports.registerFcmToken = async (req, res) => {
  const user = req.user;
  const { fcmToken, os, deviceId } = req.body;

  if (!fcmToken || !os || !deviceId) {
    return res.status(400).json({ success: false, error: "FCM token, os and deviceId are required" });
  }

  try {
    //create new fcm token
    const newFcmToken = await fcmTokenModel.create({ userId: user._id, fcmToken, os, deviceId });
    if (!newFcmToken) {
      return res.status(400).json({ success: false, error: "Failed to register FCM token" });
    }

    //send response
    res.status(200).json({ success: true, message: "FCM token registered", data: newFcmToken });
  } catch (error) {
    console.error("Register FCM token error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
