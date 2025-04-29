const isManager = (req, res, next) => {
  if (req.user.role === "manager" || req.user.role === "admin" || req.user.role === "superAdmin") {
    next();
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = isManager;
