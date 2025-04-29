const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== "superAdmin") {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

module.exports = isSuperAdmin;
