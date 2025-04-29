const express = require("express");
const router = express.Router();
const {
  createCustomer,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  addOrRemoveToFavorites,
} = require("../../controllers/v1/customer/customer.controller");
const isSuperAdmin = require("../../middleware/isSuperAdmin.middleware");
const isAuth = require("../../middleware/isAuth.middleware");

// ✅ Create customer
router.post("/create", createCustomer);

// ✅ Get single customer
router.get("/get/:id", isAuth, getCustomer);

// ✅ Update customer
router.put("/update/:id", isAuth, updateCustomer);

// ✅ Delete customers (multiple delete)
router.delete("/delete/:ids", isAuth, deleteCustomer);

// ✅ Get all customers
router.get("/getAll", getAllCustomers);

// ✅ Add to favorites and remove from favorites
router.post("/addToFavorites/:id", isAuth, addOrRemoveToFavorites);

module.exports = router;
