const jwt = require("jsonwebtoken");
const userModel = require("../models/user/user.model");
const { GUEST_WHITE_LIST_PATH } = require("../cofig/guestPath.config");

const isAuth = async (req, res, next) => {
  try {
    const headerToken = req.headers.authorization;

    //remove Bearer from token
    const token = headerToken.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //check guest token
    if (decoded.role === "guest" && GUEST_WHITE_LIST_PATH.includes(req.path)) {
      console.log("guest token", decoded);
      return next();
    }

    const userId = decoded.id;
    const user = await userModel.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isActive === false) {
      return res.status(401).json({ message: "Account is not active" });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = isAuth;
