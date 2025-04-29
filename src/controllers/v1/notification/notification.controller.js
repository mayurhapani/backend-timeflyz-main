const notificationModel = require("../../../models/notification/notification.model");
const mongoose = require("mongoose");

// Delete notification (multiple delete)
exports.deleteNotification = async (req, res) => {
  try {
    const user = req.user;
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    // only superadmin can delete notifications
    if (user?.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to delete notifications",
      });
    }

    const notificationIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = notificationIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    const notifications = await notificationModel.deleteMany({ _id: { $in: validObjectIds } });

    if (!notifications) {
      return res.status(404).json({
        success: false,
        error: "Notifications not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notifications deleted successfully",
      data: notifications,
    });
  } catch (error) {
    console.error("Delete notifications error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get all notifications
exports.getAllNotifications = async (req, res) => {
  try {
    const { search = "", type, status, startDate, endDate } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = limit && (page - 1) * limit;

    // Base query conditions
    let baseQuery = {};

    // Add search functionality if search parameter is provided
    if (search) {
      baseQuery.$or = [
        { message: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
      ];
    }

    // Add type filter
    if (type) {
      baseQuery.type = type;
    }

    // Add status filter
    if (status) {
      if (status === "read") {
        baseQuery.isRead = true;
      } else if (status === "unread") {
        baseQuery.isRead = false;
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
      } catch (dateError) {
        console.error("Date parsing error:", dateError);
      }
    }

    // Calculate notification statistics
    const stats = await notificationModel.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
          },
          typeDistribution: {
            $push: {
              type: "$type",
              count: 1,
            },
          },
        },
      },
    ]);

    // Process statistics
    const notificationStats =
      stats.length > 0
        ? {
            totalNotifications: stats[0].totalNotifications,
            unreadCount: stats[0].unreadCount,
            typeDistribution: stats[0].typeDistribution.reduce((acc, curr) => {
              acc[curr.type] = (acc[curr.type] || 0) + curr.count;
              return acc;
            }, {}),
          }
        : null;

    const resultLength = await notificationModel.countDocuments(baseQuery);

    const results = await notificationModel.find(baseQuery).skip(skip).limit(limit);

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
      stats: notificationStats,
      filters: {
        applied: {
          search,
          ...(type ? { type } : {}),
          ...(status ? { status } : {}),
          ...(startDate && endDate ? { startDate, endDate } : {}),
        },
      },
    });
  } catch (error) {
    console.error("Get all notifications error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};
