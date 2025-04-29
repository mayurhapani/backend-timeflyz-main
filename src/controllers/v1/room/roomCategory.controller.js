const roomCategoryModel = require("../../../models/room/roomCategory.model");
const mongoose = require("mongoose");

// Create a new room category
exports.createRoomCategory = async (req, res) => {
  try {
    const { hotelId, name } = req.body;

    // Validate required fields
    if (!hotelId || !name) {
      return res.status(400).json({
        success: false,
        error: "Please provide hotelId and name",
      });
    }

    // Validate if hotelId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid hotel ID format",
      });
    }

    // Check if room number already exists for this hotel
    const existingRoomCategory = await roomCategoryModel.findOne({
      hotelId,
      name,
    });

    if (existingRoomCategory) {
      return res.status(400).json({
        success: false,
        error: "Room category already exists for this hotel",
      });
    }

    // Create new room
    const newRoomCategory = await roomCategoryModel.create({
      hotelId,
      name,
    });

    res.status(201).json({
      success: true,
      data: newRoomCategory,
    });
  } catch (error) {
    console.error("Create room category error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get single room category
exports.getRoomCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid room category ID format",
      });
    }

    const roomCategory = await roomCategoryModel.findById(id).populate("hotelId", "name city").lean();

    if (!roomCategory) {
      return res.status(404).json({
        success: false,
        error: "Room category not found",
      });
    }

    res.status(200).json({
      success: true,
      data: roomCategory,
    });
  } catch (error) {
    console.error("Get room category error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Update room category
exports.updateRoomCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid room category ID format",
      });
    }

    // Check if room exists
    const existingRoomCategory = await roomCategoryModel.findById(id);
    if (!existingRoomCategory) {
      return res.status(404).json({
        success: false,
        error: "Room category not found",
      });
    }

    // If room category name is being updated, check if it already exists for this hotel
    if (name && name !== existingRoomCategory.name) {
      const roomCategoryWithSameName = await roomCategoryModel.findOne({
        hotelId: existingRoomCategory.hotelId,
        name,
        _id: { $ne: req.params.id },
      });

      if (roomCategoryWithSameName) {
        return res.status(400).json({
          success: false,
          error: "Room category already exists for this hotel",
        });
      }
    }

    // Update room category
    const roomCategory = await roomCategoryModel
      .findByIdAndUpdate(
        id,
        {
          name,
        },
        { new: true, runValidators: true }
      )
      .populate("hotelId", "name city")
      .lean();

    res.status(200).json({
      success: true,
      data: roomCategory,
    });
  } catch (error) {
    console.error("Update room category error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Delete room categorys (multiple delete)
exports.deleteRoomCategory = async (req, res) => {
  try {
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    const roomCategoryIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = roomCategoryIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    const roomCategories = await roomCategoryModel.deleteMany({ _id: { $in: validObjectIds } });

    if (!roomCategories) {
      return res.status(404).json({
        success: false,
        error: "Room categories not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Room categories deleted successfully",
      data: roomCategories,
    });
  } catch (error) {
    console.error("Delete room categories error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get all room categories
exports.getAllRoomCategories = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { search = "" } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = limit && (page - 1) * limit;

    // Base query conditions
    let baseQuery = {};

    // search by multiple hotelId
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

    // Add search functionality if search parameter is provided
    if (search) {
      baseQuery.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    const resultLength = await roomCategoryModel.countDocuments(baseQuery);

    const results = await roomCategoryModel.find(baseQuery).skip(skip).limit(limit);

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
          ...(hotelId ? { hotelId } : {}),
        },
      },
    });
  } catch (error) {
    console.error("Get all room categories error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};
