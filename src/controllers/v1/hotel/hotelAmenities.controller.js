const hotelAmenityModel = require("../../../models/hotel/hotelAmenity.model");
const mongoose = require("mongoose");

// Create a new hotel amenity
exports.createHotelAmenity = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Please provide name",
      });
    }

    // Check if hotel amenity already exists
    const existingHotelAmenity = await hotelAmenityModel.findOne({ name });
    if (existingHotelAmenity) {
      return res.status(400).json({
        success: false,
        error: "Hotel amenity already exists",
      });
    }
    // Create new hotel amenity
    const newHotelAmenity = await hotelAmenityModel.create({ name });

    res.status(201).json({
      success: true,
      data: newHotelAmenity,
    });
  } catch (error) {
    console.error("Create hotel amenity error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get single hotel amenity by id
exports.getHotelAmenity = async (req, res) => {
  try {
    const user = req.user;
    const hotelAmenity = await hotelAmenityModel.findById(req.params.id);

    // only superadmin can see deleted hotel amenities
    if (user?.role !== "superAdmin" && !hotelAmenity.isActive) {
      return res.status(404).json({
        success: false,
        error: "Hotel amenity is not active",
      });
    }

    if (!hotelAmenity) {
      return res.status(404).json({
        success: false,
        error: "Hotel amenity not found",
      });
    }

    res.status(200).json({
      success: true,
      data: hotelAmenity,
    });
  } catch (error) {
    console.error("Get hotel amenity error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Update hotel amenity by id
exports.updateHotelAmenity = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid hotel amenity ID format",
      });
    }

    // Check if hotel amenity exists
    const existingHotelAmenity = await hotelAmenityModel.findById(req.params.id);
    if (!existingHotelAmenity) {
      return res.status(404).json({
        success: false,
        error: "Hotel amenity not found",
      });
    }

    // only superadmin can update hotel amenities
    if (user?.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to update hotel amenities",
      });
    }

    // Update hotel amenity
    const hotelAmenity = await hotelAmenityModel
      .findByIdAndUpdate(req.params.id, { name }, { new: true, runValidators: true })
      .lean();

    res.status(200).json({
      success: true,
      data: hotelAmenity,
    });
  } catch (error) {
    console.error("Update hotel amenity error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Delete hotel amenities (multiple delete)
exports.deleteHotelAmenity = async (req, res) => {
  try {
    const user = req.user;
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    // only superadmin can delete hotel amenities
    if (user?.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to delete hotel amenities",
      });
    }

    const hotelAmenityIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = hotelAmenityIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    const hotelAmenities = await hotelAmenityModel.deleteMany({ _id: { $in: validObjectIds } });

    if (!hotelAmenities) {
      return res.status(404).json({
        success: false,
        error: "Hotel amenities not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Hotel amenities deleted successfully",
      data: hotelAmenities,
    });
  } catch (error) {
    console.error("Delete hotel amenity error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get all hotel amenities
exports.getAllHotelAmenities = async (req, res) => {
  try {
    const user = req.user;
    const { search = "", hotelId } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    // only superadmin can see inactive and deleted hotel amenities
    if (user?.role !== "superAdmin") {
      query.isActive = true;
    }

    if (hotelId) {
      query.hotelId = hotelId;
    }

    const resultLength = await hotelAmenityModel.countDocuments(query);

    const results = await hotelAmenityModel.find(query).select("name _id").skip(skip).limit(limit);

    return res.status(200).json({
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
    console.error("Get all hotel amenities error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};
