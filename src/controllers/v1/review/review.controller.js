const reviewModel = require("../../../models/review/review.model");
const mongoose = require("mongoose");

// ✅ Create a new review
exports.createReview = async (req, res) => {
  try {
    const { customerId, hotelId, rating, comment } = req.body;

    // Validate required fields
    if (!customerId || !hotelId || !rating) {
      return res.status(400).json({
        success: false,
        error: "Please provide customerId, hotelId, and rating",
      });
    }

    // Validate if IDs are valid MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ID format for customer or hotel",
      });
    }

    // Validate rating range (1-5)
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: "Rating must be between 1 and 5",
      });
    }

    // Create new review
    const newReview = await reviewModel.create({
      customerId,
      hotelId,
      rating,
      comment: comment || "",
      replyByHotel: "",
    });

    // Populate the review with details
    const populatedReview = await reviewModel
      .findById(newReview._id)
      .populate("customerDetails")
      .populate("hotelDetails")
      .lean();

    res.status(201).json({
      success: true,
      data: populatedReview,
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Get single review
exports.getReview = async (req, res) => {
  try {
    const user = req.user;
    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid review ID format",
      });
    }

    // only superadmin can see deleted reviews
    if (user?.role !== "superAdmin" && review.isDeleted) {
      return res.status(404).json({
        success: false,
        error: "Review is deleted",
      });
    }

    // only superadmin can see inactive reviews
    if (user?.role !== "superAdmin" && !review.isActive) {
      return res.status(404).json({
        success: false,
        error: "Review is not active",
      });
    }

    const review = await reviewModel
      .findById(req.params.id)
      .populate("customerDetails")
      .populate("hotelDetails")
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Get review error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Update review
exports.updateReview = async (req, res) => {
  try {
    const user = req.user;
    const { rating, comment, replyByHotel, isActive, isDeleted } = req.body;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid review ID format",
      });
    }

    // Check if review exists
    const existingReview = await reviewModel.findById(req.params.id);
    if (!existingReview) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      });
    }

    // Validate rating if provided
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: "Rating must be between 1 and 5",
        });
      }
    }

    //only superadmin can update isActive and isDeleted review
    if (user?.role !== "superAdmin" && (isActive || isDeleted)) {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to update isActive and isDeleted review",
      });
    }

    // craete payload
    const payload = {
      rating,
      comment,
      replyByHotel,
    };

    if (isActive) {
      payload.isActive = isActive;
    }
    if (isDeleted) {
      payload.isDeleted = isDeleted;
    }

    //clear undefined values from payload
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    // Update review
    const review = await reviewModel
      .findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
      .populate("customerDetails")
      .populate("hotelDetails")
      .lean();

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Delete review (multiple delete)
exports.deleteReview = async (req, res) => {
  try {
    const user = req.user;
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    const reviewIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = reviewIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    // only superadmin can delete reviews
    if (user?.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to delete reviews",
      });
    }

    const reviews = await reviewModel.deleteMany({ _id: { $in: validObjectIds } });

    if (!reviews) {
      return res.status(404).json({
        success: false,
        error: "Reviews not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reviews deleted successfully",
      data: reviews,
    });
  } catch (error) {
    console.error("Delete reviews error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Get all reviews
exports.getAllReviews = async (req, res) => {
  try {
    const user = req.user;
    const { search = "", rating, startDate, endDate, hotelId, customerId } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = limit && (page - 1) * limit;

    // Base query conditions
    let baseQuery = {};

    // Handle hotelId - allow multiple hotel search
    if (hotelId) {
      // Split comma-separated IDs if present
      const hotelIdArray = hotelId.includes(",") ? hotelId.split(",") : [hotelId];

      // Convert valid strings to ObjectIds
      const validHotelIds = hotelIdArray
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validHotelIds.length > 0) {
        baseQuery.hotelId = { $in: validHotelIds };
      }
    }

    // Handle customerId - allow multiple customer search
    if (customerId) {
      // Split comma-separated IDs if present
      const customerIdArray = customerId.includes(",") ? customerId.split(",") : [customerId];

      // Convert valid strings to ObjectIds
      const validCustomerIds = customerIdArray
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validCustomerIds.length > 0) {
        baseQuery.customerId = { $in: validCustomerIds };
      }
    }

    // Add rating filter with validation
    if (rating) {
      const parsedRating = parseInt(rating);
      if (!isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
        baseQuery.rating = parsedRating;
      }
    }

    // Add date range filter
    if (startDate && endDate) {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          baseQuery.createdAt = {
            $gte: start,
            $lte: end,
          };
        }
      } catch (error) {
        console.error("Date parsing error:", error);
      }
    }

    // only superadmin can see inactive and deleted reviews
    if (user?.role !== "superAdmin") {
      baseQuery.isActive = true;
      baseQuery.isDeleted = false;
    }

    // Add search functionality if search parameter is provided
    if (search) {
      baseQuery.$or = [
        { comment: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "hotel.name": { $regex: search, $options: "i" } },
      ];
    }

    // Calculate average rating
    const ratingStats = await reviewModel.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          ratingCounts: {
            $push: {
              rating: "$rating",
              count: 1,
            },
          },
        },
      },
    ]);

    // Process rating statistics
    const stats =
      ratingStats.length > 0
        ? {
            averageRating: parseFloat(ratingStats[0].averageRating.toFixed(1)),
            ratingDistribution: Array.from({ length: 5 }, (_, i) => ({
              rating: i + 1,
              count: ratingStats[0].ratingCounts.filter((r) => r.rating === i + 1).length,
            })),
          }
        : null;

    // Get paginated results
    const resultLength = await reviewModel.countDocuments(baseQuery);

    const results = await reviewModel.find(baseQuery).skip(skip).limit(limit);

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
      stats,
      filters: {
        applied: {
          search,
          rating,
          startDate,
          endDate,
          ...(hotelId ? { hotelId } : {}),
          ...(customerId ? { customerId } : {}),
        },
      },
    });
  } catch (error) {
    console.error("Get all reviews error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};
