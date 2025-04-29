const userModel = require("../../../models/user/user.model");
const mongoose = require("mongoose");
const {
  imageUploadToS3,
  imageDeleteFromS3,
  singleImageDeleteFromS3,
} = require("../../../utils/file upload/imageUploadToS3");

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const user = req.user;
    const { name, email, password, role, phone, profilePic, hotelId, isChainAdmin, isActive } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: "Please provide email, password and role",
      });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User already exists",
      });
    }

    //check if user is admin
    if (user.role !== "admin" && user.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to create a user",
      });
    }

    //if new user role is admin or super admin
    if ((role === "admin" || role === "superAdmin") && user.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to create a admin user",
      });
    }

    // Create user data object
    const userData = {
      name,
      email,
      password,
      role,
      phone,
      hotelId: [],
      isChainAdmin,
    };

    if (isActive) {
      userData.isActive = isActive;
    }

    // If user is a support agent, set supportAgentStatus
    if (role === "supportAgent") {
      userData.supportAgentStatus = "available";
    }

    //add hotelId in userData
    if (hotelId) {
      const hotelIds = hotelId.includes(",") ? hotelId.split(",") : [hotelId];

      // Convert valid strings to ObjectIds
      const validObjectIds = hotelIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validObjectIds.length > 0) {
        if (!isChainAdmin && (role === "admin" || role === "manager")) {
          userData.hotelId[0] = hotelId;
        } else if (isChainAdmin) {
          userData.hotelId = validObjectIds;
        } else {
          return res.status(400).json({
            success: false,
            error: "You can add only one hotel",
          });
        }
      }
    }

    // Create new user
    const newUser = await userModel.create(userData);

    //upload profilePic to s3
    if (profilePic) {
      const profilePicUrl = await imageUploadToS3(profilePic, "user", newUser._id);
      newUser.profilePic = profilePicUrl;
      await newUser.save();
    }

    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get single user
exports.getUser = async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // only superadmin can see inactive users
    if (!user.isActive && user.role !== "superAdmin") {
      return res.status(404).json({
        success: false,
        error: "User is not active",
      });
    }

    // only superadmin can see deleted users
    if (user.role !== "superAdmin" && user.isDeleted) {
      return res.status(404).json({
        success: false,
        error: "User is deleted",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, phone, profilePic, hotelId, isActive, isDeleted, supportAgentStatus, isChainAdmin } =
      req.body;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    // Check if email is being updated and if it's already taken
    if (email) {
      const existingUser = await userModel.findOne({
        email: email,
        _id: { $ne: req.params.id }, // Exclude current user
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Email already in use by another user",
        });
      }
    }

    // only superadmin can update deleted users
    if (isDeleted && user.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "User is already deleted",
      });
    }

    // Create update object with allowed fields
    const updateData = {
      name,
      email,
      phone,
      hotelId: [],
    };

    //add isDeleted, isActive, supportAgentStatus, isChainAdmin, role in updateData
    if (isDeleted) {
      updateData.isDeleted = isDeleted;
    }
    if (isActive) {
      updateData.isActive = isActive;
    }
    if (supportAgentStatus) {
      updateData.supportAgentStatus = supportAgentStatus;
    }
    if (isChainAdmin) {
      updateData.isChainAdmin = isChainAdmin;
    }
    if (role) {
      updateData.role = role;
    }

    //add hotelId in userData
    if (hotelId) {
      const hotelIds = hotelId.includes(",") ? hotelId.split(",") : [hotelId];

      // Convert valid strings to ObjectIds
      const validObjectIds = hotelIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validObjectIds.length > 0) {
        if (!isChainAdmin && (role === "admin" || role === "manager")) {
          updateData.hotelId[0] = hotelId;
        } else if (isChainAdmin) {
          updateData.hotelId = validObjectIds;
        } else {
          return res.status(400).json({
            success: false,
            error: "You can add only one hotel",
          });
        }
      }
    }

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update user
    const updatedUser = await userModel
      .findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-password");

    //upload profilePic to s3
    if (profilePic) {
      // //delete old profilePic from s3
      // if (updatedUser.profilePic) {
      //   await singleImageDeleteFromS3("user", updatedUser._id, updatedUser.profilePic);
      // }

      const profilePicUrl = await imageUploadToS3(profilePic, "user", updatedUser._id);
      updatedUser.profilePic = profilePicUrl;
      await updatedUser.save();
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);

    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Email already in use by another user",
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Delete user (multiple delete)
exports.deleteUser = async (req, res) => {
  try {
    const user = req.user;
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    const userIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = userIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    // only superadmin can delete users
    if (user?.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to delete users",
      });
    }

    //multiple delete
    const users = await userModel.deleteMany({ _id: { $in: validObjectIds } });

    if (!users) {
      return res.status(404).json({
        success: false,
        error: "Users not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Users deleted successfully",
      data: users,
    });
  } catch (error) {
    console.error("Delete users error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const user = req.user;
    const { search = "", role, isActive, hotelId, customerId } = req.query;
    const baseQuery = {};

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = limit && (page - 1) * limit;

    if (role) {
      baseQuery.role = role;
    }

    // only superadmin can see inactive users
    if (user?.role !== "superAdmin") {
      baseQuery.isActive = true;
    }

    // only superadmin can see deleted users
    if (user?.role !== "superAdmin") {
      baseQuery.isDeleted = false;
    }

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

    if (customerId) {
      const customerIds = customerId.includes(",") ? customerId.split(",") : [customerId];

      // Convert valid strings to ObjectIds
      const validObjectIds = customerIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validObjectIds.length > 0) {
        baseQuery.hotelId = { $in: validObjectIds };
      }
    }

    // Add search functionality if search parameter is provided
    if (search) {
      baseQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const resultLength = await userModel.countDocuments(baseQuery);
    const results = await userModel.find(baseQuery).select("-password").skip(skip).limit(limit);

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
          ...(role ? { role } : {}),
          ...(isActive ? { isActive } : {}),
        },
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};
