const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret_key_guest";

exports.createGuest = async (req, res) => {
  try {
    console.log("createGuest");
    const guestId = uuidv4(); // Random unique ID
    const payload = {
      id: guestId,
      role: "guest",
      type: "guest",
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE_GUEST, // token expiry time
    });

    return res.status(200).json({
      success: true,
      message: "Guest token generated successfully",
      token,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
