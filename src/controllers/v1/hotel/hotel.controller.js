const hotelModel = require("../../../models/hotel/hotel.model");
const mongoose = require("mongoose");
const { imageUploadToS3, imageDeleteFromS3 } = require("../../../utils/file upload/imageUploadToS3");
const bookingModel = require("../../../models/booking/booking.model");

// Create a new hotel
exports.createHotel = async (req, res) => {
  try {
    const user = req.user;
    const {
      name,
      description,
      address,
      city,
      state,
      country,
      pincode,
      location,
      images,
      amenitiesId,
      adminId,
      managers,
      contactNumber,
      email,
      website,
      rating,
      totalReviews,
    } = req.body;

    // Validate required fields
    if (!name || !address || !city || !country || !contactNumber || !email) {
      return res.status(400).json({
        success: false,
        error: "Please provide name, address, city, country, contact number and email",
      });
    }

    console.log("user", user);

    //admin can create hotel
    if (user.role !== "admin" && user.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to create a hotel",
      });
    }

    //check is chain admin
    if (user.role === "admin" && user.isChainAdmin === false) {
      const hotels = await hotelModel.find({ adminId: user._id });
      console.log("hotels", hotels);
      if (hotels.length > 0) {
        return res.status(400).json({
          success: false,
          error: "You are not authorized to create more than one hotel",
        });
      }
    }

    const admin = user.role === "admin" ? user._id : adminId;

    // check hotel already exists check by name and pincode
    const existingHotel = await hotelModel.findOne({ name, pincode });
    if (existingHotel) {
      return res.status(400).json({
        success: false,
        error: "Hotel already exists",
      });
    }

    // Create new hotel
    const newHotel = await hotelModel.create({
      name,
      description,
      address,
      city,
      state,
      country,
      pincode,
      location,
      amenitiesId: amenitiesId || [],
      adminId: admin,
      managers: managers || [],
      contactNumber,
      email,
      website,
      rating,
      totalReviews,
    });

    // upload images to s3
    if (images) {
      const uploadedImages = await imageUploadToS3(images, "hotels", newHotel._id);
      newHotel.images = uploadedImages;
      await newHotel.save();
    }

    res.status(201).json({
      success: true,
      message: "Hotel created successfully",
      data: newHotel,
    });
  } catch (error) {
    console.error("Create hotel error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get hotel by ID
exports.getHotel = async (req, res) => {
  try {
    const user = req.user;

    const hotel = await hotelModel
      .findById(req.params.id)
      .populate("adminDetails", "name email")
      .populate("managerDetails", "name email")
      .populate("amenitiesDetails", "name")
      .lean();

    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }

    // only superadmin can see deleted hotels
    if (user?.role !== "superAdmin" && hotel.isDeleted) {
      return res.status(404).json({
        success: false,
        error: "Hotel is deleted",
      });
    }

    // only superadmin can see inactive hotels
    if (user?.role !== "superAdmin" && hotel.isActive === false) {
      return res.status(404).json({
        success: false,
        error: "Hotel is not active",
      });
    }

    res.status(200).json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    console.error("Get hotel error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Update hotel
exports.updateHotel = async (req, res) => {
  try {
    const user = req.user;

    const {
      name,
      description,
      address,
      city,
      state,
      country,
      pincode,
      location,
      images,
      amenitiesId,
      adminId,
      managers,
      contactNumber,
      email,
      website,
      isActive,
      isDeleted,
    } = req.body;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid hotel ID format",
      });
    }

    // Check if hotel exists
    const existingHotel = await hotelModel.findById(req.params.id);

    //only superadmin can update inactive hotel
    if (!existingHotel || (existingHotel.isActive === false && user.role !== "superAdmin")) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }

    //is email already taken
    if (email && email !== existingHotel.email) {
      const emailTaken = await hotelModel.findOne({ email });
      if (emailTaken) {
        return res.status(400).json({ success: false, error: "Email already taken" });
      }
    }

    // Check if update would create a duplicate (same name and pincode, but different ID)
    if (name && pincode) {
      const duplicateHotel = await hotelModel.findOne({
        name,
        pincode,
        _id: { $ne: req.params.id }, // Exclude the current hotel
      });

      if (duplicateHotel) {
        return res.status(400).json({
          success: false,
          error: "Another hotel with this name and pincode already exists",
        });
      }
    }

    // only superadmin can update deleted hotels
    if (isDeleted && user.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "Hotel is already deleted",
      });
    }

    //create payload
    const payload = {
      name,
      description,
      address,
      city,
      state,
      country,
      pincode,
      location,
      amenitiesId: amenitiesId || [],
      contactNumber,
      email,
      website,
    };

    // add isDeleted in updateData
    if (isDeleted) {
      payload.isDeleted = isDeleted;
    }
    if (isActive) {
      payload.isActive = isActive;
    }
    if (adminId) {
      payload.adminId = adminId;
    }
    if (managers) {
      payload.managers = managers;
    }

    // Update hotel
    const hotel = await hotelModel
      .findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
      .populate("adminDetails", "name email")
      .populate("managerDetails", "name email")
      .lean();

    let updatedHotel = hotel;
    if (images) {
      // upload images to s3
      const uploadedImages = await imageUploadToS3(images, "hotels", hotel._id);

      // update hotel with uploaded images
      updatedHotel = await hotelModel.findByIdAndUpdate(hotel._id, { images: uploadedImages }, { new: true });
    }

    res.status(200).json({
      success: true,
      message: "Hotel updated successfully",
      data: updatedHotel,
    });
  } catch (error) {
    console.error("Update hotel error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Delete hotels (multiple delete)
exports.deleteHotel = async (req, res) => {
  try {
    const user = req.user;
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    const hotelIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = hotelIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    //only superadmin can delete hotel
    if (user.role !== "superAdmin") {
      return res.status(404).json({
        success: false,
        error: "You are not authorized to delete hotels",
      });
    }

    // Fetch all hotels
    const hotelsToDelete = await hotelModel.find({ _id: { $in: validObjectIds } });
    if (hotelsToDelete.length !== validObjectIds.length) {
      return res.status(404).json({
        success: false,
        error: "One or more hotels not found",
      });
    }

    // Delete images for each hotel
    await Promise.all(
      hotelsToDelete.map(async (hotel) => {
        if (hotel.images && hotel.images.length > 0) {
          console.log("Deleting images for hotel", hotel._id);
          await imageDeleteFromS3("hotels", hotel._id.toString());
        }
      })
    );

    // Remove hotels
    const deleteResult = await hotelModel.deleteMany({ _id: { $in: validObjectIds } });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Hotels not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hotels deleted successfully",
      data: deleteResult,
    });
  } catch (error) {
    console.error("Delete hotel error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Search hotels
exports.getAllHotels = async (req, res) => {
  try {
    const user = req.user;

    const { search = "", lat, lng, distance, adminId, customerId, amenitiesId } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = limit && (page - 1) * limit;

    // Base query conditions
    let baseQuery = {};

    // Add amenitiesId filter if provided
    if (amenitiesId) {
      console.log("amenitiesId", amenitiesId);

      // Split comma-separated IDs if present
      const amenityIdArray = amenitiesId.includes(",")
        ? amenitiesId.split(",")
        : Array.isArray(amenitiesId)
        ? amenitiesId
        : [amenitiesId];

      // Convert valid strings to ObjectIds
      const validObjectIds = amenityIdArray
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validObjectIds.length > 0) {
        baseQuery.amenitiesId = { $in: validObjectIds };
      }
    }

    // Handle adminId - allow multiple admin search
    if (adminId) {
      // Split comma-separated IDs if present
      const adminIdArray = adminId.includes(",") ? adminId.split(",") : [adminId];

      // Convert valid strings to ObjectIds
      const validAdminIds = adminIdArray
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validAdminIds.length > 0) {
        baseQuery.adminId = { $in: validAdminIds };
      }
    }

    // search by customerId
    if (customerId) {
      const bookings = await bookingModel.find({ customerId }).distinct("hotelId");
      if (bookings.length > 0) {
        baseQuery._id = { $in: bookings };
      }
    }

    //only superadmin can see inactive hotels
    if (user?.role !== "superAdmin") {
      baseQuery.isActive = true;
    }

    // only superadmin can see deleted hotels
    if (user?.role !== "superAdmin") {
      baseQuery.isDeleted = false;
    }

    if (lat && lng) {
      // For geospatial queries, keep using the aggregation pipeline
      const maxDistance = distance ? parseInt(distance) : 5000;

      let pipeline = [];

      pipeline.push({
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance",
          maxDistance,
          spherical: true,
          query: {
            ...(search
              ? {
                  $or: [
                    { name: { $regex: search, $options: "i" } },
                    { city: { $regex: search, $options: "i" } },
                    { country: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { contactNumber: { $regex: search, $options: "i" } },
                  ],
                }
              : {}),
            ...baseQuery,
          },
        },
      });

      // Count total matches for pagination
      const countPipeline = [...pipeline];
      countPipeline.push({ $count: "totalCount" });
      const countResult = await hotelModel.aggregate(countPipeline);
      const totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;

      // Add pagination
      if (limit) {
        pipeline.push({ $skip: skip }, { $limit: limit });
      }

      const results = await hotelModel.aggregate(pipeline);

      return res.status(200).json({
        success: true,
        data: results,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
          hasMore: results.length === limit && skip + results.length < totalCount,
        },
        filters: {
          applied: {
            search,
            ...(lat && lng ? { lat, lng, distance } : {}),
            ...(amenitiesId ? { amenitiesId } : {}),
            ...(adminId ? { adminId } : {}),
            ...(customerId ? { customerId } : {}),
          },
        },
      });
    } else {
      // For non-geospatial queries, use the pagination utility
      let query = { ...baseQuery };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { city: { $regex: search, $options: "i" } },
          { country: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { contactNumber: { $regex: search, $options: "i" } },
        ];
      }

      const resultLength = await hotelModel.countDocuments(query);

      const results = await hotelModel.find(query).skip(skip).limit(limit);

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
            ...(lat && lng ? { lat, lng, distance } : {}),
            ...(amenitiesId ? { amenitiesId } : {}),
            ...(adminId ? { adminId } : {}),
            ...(customerId ? { customerId } : {}),
          },
        },
      });
    }
  } catch (error) {
    console.error("Search hotels error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};
