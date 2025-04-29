const customerModel = require("../../../models/customer/customer.model");
const mongoose = require("mongoose");

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, password, phone, profilePic } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    // Check if customer already exists
    const existingCustomer = await customerModel.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        error: "Customer already exists",
      });
    }

    // Create new customer
    const newCustomer = await customerModel.create({
      name,
      email,
      password,
      phone,
      favorites: [],
      searchHistory: [],
      bookingHistory: [],
      reviewsGiven: [],
    });

    //upload profilePic to s3
    if (profilePic) {
      const profilePicUrl = await imageUploadToS3(profilePic, "customer", newCustomer._id);
      newCustomer.profilePic = profilePicUrl;
      await newCustomer.save();
    }

    // Remove password from response
    const customerResponse = newCustomer.toObject();
    delete customerResponse.password;

    res.status(201).json({
      success: true,
      data: customerResponse,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Get single customer
exports.getCustomer = async (req, res) => {
  try {
    const user = req.user;
    const customer = await customerModel.findById(req.params.id).select("-password");
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    // only superadmin can see deleted customers
    if (user?.role !== "superAdmin" && customer.isDeleted) {
      return res.status(404).json({
        success: false,
        error: "Customer is deleted",
      });
    }

    // only superadmin can see inactive customers
    if (!customer.isActive && user.role !== "superAdmin") {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { name, email, phone, profilePic, isActive, isDeleted } = req.body;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid customer ID format",
      });
    }

    // only superadmin can update deleted customers
    if (isDeleted && user.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "Customer is already deleted",
      });
    }

    // Check if email is being updated and if it's already taken
    if (email) {
      const existingCustomer = await customerModel.findOne({
        email: email,
        _id: { $ne: req.params.id }, // Exclude current customer
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          error: "Email already in use by another customer",
        });
      }
    }

    // Create update object with allowed fields
    const updateData = {
      name,
      email,
      phone,
      profilePic,
      isActive,
    };

    //add isDeleted in updateData
    if (isDeleted) {
      updateData.isDeleted = isDeleted;
    }

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update customer
    const customer = await customerModel
      .findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .select("-password");

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Email already in use by another customer",
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Delete customers (multiple delete)
exports.deleteCustomer = async (req, res) => {
  try {
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    const customerIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = customerIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    // only superadmin can delete customers
    if (user?.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to delete customers",
      });
    }

    const customers = await customerModel.deleteMany({ _id: { $in: validObjectIds } });

    if (!customers) {
      return res.status(404).json({
        success: false,
        error: "Customers not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Customers deleted successfully",
      data: customers,
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const user = req.user;
    const { search = "", isActive, hotelId } = req.query;
    const baseQuery = {};

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = limit && (page - 1) * limit;

    // only superadmin can see inactive customers
    if (user?.role !== "superAdmin") {
      baseQuery.isActive = true;
    }

    // only superadmin can see deleted customers
    if (user?.role !== "superAdmin") {
      baseQuery.isDeleted = false;
    }

    if (search) {
      baseQuery.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    }

    //get all customers by multiple hotelId
    if (hotelId) {
      const hotelIds = hotelId.includes(",") ? hotelId.split(",") : [hotelId];

      // Convert valid strings to ObjectIds
      const validObjectIds = hotelIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validObjectIds.length > 0) {
        baseQuery.hotelId = { $in: validObjectIds };
      }
    }

    const resultLength = await customerModel.countDocuments(baseQuery);
    const results = await customerModel.find(baseQuery).select("-password").skip(skip).limit(limit);

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        total: resultLength,
        page,
        limit,
        pages: Math.ceil(resultLength / limit),
        hasMore: results.length === limit && skip + results.length < resultLength,
      },
      filters: {
        applied: {
          search,
          ...(isActive ? { isActive } : {}),
        },
      },
    });
  } catch (error) {
    console.error("Get all customers error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Add to favorites and remove from favorites
exports.addOrRemoveToFavorites = async (req, res) => {
  try {
    const { hotelId } = req.body;
    const customerId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(hotelId) || !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ID format",
      });
    }

    //add to favorites and remove if already in favorites
    const isFavorite = await customerModel.findOne({ _id: customerId, favorites: hotelId });

    if (isFavorite) {
      await customerModel.findByIdAndUpdate(
        customerId,
        { $pull: { favorites: hotelId } },
        { new: true, runValidators: true }
      );
    } else {
      await customerModel.findByIdAndUpdate(
        customerId,
        { $addToSet: { favorites: hotelId } },
        { new: true, runValidators: true }
      );
    }

    const customer = await customerModel.findById(customerId).select("name email favorites");

    //count number of favorites
    const favoriteCount = customer.favorites.length;

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { customer, favoriteCount },
    });
  } catch (error) {
    console.error("Add to favorites error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};
