const mongoose = require("mongoose");
const slotModel = require("../../../models/slot/slot.model");
const hotelModel = require("../../../models/hotel/hotel.model");
const masterRoomModel = require("../../../models/room/masterRoom.model");
const subRoomModel = require("../../../models/room/subRooms.model");

// Create a new slot
exports.createSlot = async (req, res) => {
  try {
    const { hotelId, masterRoomId, subRoomId, date, manualSlots } = req.body;

    // Validate required fields
    if (!hotelId || !masterRoomId || !subRoomId || !date || !manualSlots) {
      return res.status(400).json({
        success: false,
        error: "Please provide all required fields: hotelId, masterRoomId, subRoomId, date, manualSlots",
      });
    }

    // Validate if hotelId is a valid MongoDB ObjectId
    if (
      !mongoose.Types.ObjectId.isValid(hotelId) ||
      !mongoose.Types.ObjectId.isValid(masterRoomId) ||
      !mongoose.Types.ObjectId.isValid(subRoomId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid hotel ID format",
      });
    }

    // Check if hotel exists
    const hotel = await hotelModel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }

    // Validate manualSlots
    if (!Array.isArray(manualSlots) || manualSlots.length === 0) {
      return res.status(400).json({
        success: false,
        error: "manualSlots must be a non-empty array",
      });
    }

    // extract slotDuration and fullDayPrice from masterRoom
    const masterRoom = await masterRoomModel.findById(masterRoomId);
    const subRoom = await subRoomModel.findById(subRoomId);

    if (!masterRoom && !subRoom) {
      return res.status(404).json({
        success: false,
        error: "Master room or sub room not found",
      });
    }

    const fullDayPrice = masterRoom.fullDayPrice;
    const slotDuration = subRoom.slotDuration;

    //price calculation as per slot duration
    let slotPrice = 0;

    switch (slotDuration) {
      case 3:
        slotPrice = (fullDayPrice * 30) / 100;
        break;
      case 6:
        slotPrice = (fullDayPrice * 50) / 100;
        break;
      case 12:
        slotPrice = (fullDayPrice * 75) / 100;
        break;
    }

    // add price to manualSlots
    const updatedManualSlots = manualSlots.map((slot) => ({
      ...slot,
      price: slotPrice.toFixed(2),
    }));

    // Create new slot
    const newSlot = await slotModel.create({
      hotelId,
      masterRoomId,
      subRoomId,
      date,
      manualSlots: updatedManualSlots,
      isActive: req.body.isActive ? req.body.isActive : true,
    });

    res.status(201).json({
      success: true,
      message: "Slot created successfully",
      data: newSlot,
    });
  } catch (error) {
    console.error("Create slot error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get single slot
exports.getSlot = async (req, res) => {
  try {
    const user = req.user;
    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid slot ID format",
      });
    }

    const slot = await slotModel
      .findById(req.params.id)
      .populate("hotelDetails", "name")
      .populate("masterRoomDetails", "masterRoomName")
      .populate("subRoomDetails", "subRoomName")
      .lean();

    if (!slot) {
      return res.status(404).json({
        success: false,
        error: "Slot not found",
      });
    }

    // only superadmin can see deleted slots
    if (slot.isDeleted && user?.role !== "superAdmin") {
      return res.status(404).json({
        success: false,
        error: "Slot not found",
      });
    }

    res.status(200).json({
      success: true,
      data: slot,
    });
  } catch (error) {
    console.error("Get slot error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Update slot
exports.updateSlot = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { hotelId, masterRoomId, subRoomId, date, manualSlots, isActive, isDeleted } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(hotelId) ||
      !mongoose.Types.ObjectId.isValid(masterRoomId) ||
      !mongoose.Types.ObjectId.isValid(subRoomId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid slot ID format",
      });
    }

    // Check if slot exists
    const existingSlot = await slotModel.findById(id);
    if (!existingSlot) {
      return res.status(404).json({
        success: false,
        error: "Slot not found",
      });
    }

    // only superadmin can update deleted slots
    if (existingSlot.isDeleted && user?.role !== "superAdmin") {
      return res.status(404).json({
        success: false,
        error: "Slot not found",
      });
    }

    // Validate manualSlots if provided
    if (!Array.isArray(manualSlots) || manualSlots.length === 0) {
      return res.status(400).json({
        success: false,
        error: "manualSlots must be a non-empty array",
      });
    }

    // extract slotDuration and fullDayPrice from masterRoom
    const masterRoom = await masterRoomModel.findById(masterRoomId);
    const subRoom = await subRoomModel.findById(subRoomId);

    if (!masterRoom && !subRoom) {
      return res.status(404).json({
        success: false,
        error: "Master room or sub room not found",
      });
    }

    const fullDayPrice = masterRoom.fullDayPrice;
    const slotDuration = subRoom.slotDuration;

    //price calculation as per slot duration
    let slotPrice = 0;

    switch (slotDuration) {
      case 3:
        slotPrice = (fullDayPrice * 30) / 100;
        break;
      case 6:
        slotPrice = (fullDayPrice * 50) / 100;
        break;
      case 12:
        slotPrice = (fullDayPrice * 75) / 100;
        break;
    }

    // add price to manualSlots
    const updatedManualSlots = manualSlots.map((slot) => ({
      ...slot,
      price: slotPrice.toFixed(2),
    }));

    // Validate dates
    const slotDate = new Date(date);
    if (isNaN(slotDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    // Update slot
    const slot = await slotModel.findByIdAndUpdate(
      id,
      {
        hotelId,
        masterRoomId,
        subRoomId,
        date: slotDate,
        manualSlots: updatedManualSlots,
        isActive,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Slot updated successfully",
      data: slot,
    });
  } catch (error) {
    console.error("Update slot error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Delete slot
exports.deleteSlot = async (req, res) => {
  try {
    const user = req.user;
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    // only superadmin can delete slots
    if (user?.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to delete slots",
      });
    }

    const slotIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = slotIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    // Delete slots
    const deleteResult = await slotModel.deleteMany({ _id: { $in: validObjectIds } });

    if (!deleteResult) {
      return res.status(404).json({
        success: false,
        error: "Slots not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Slots deleted successfully",
      data: deleteResult,
    });
  } catch (error) {
    console.error("Delete slots error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get all slots
exports.getAllSlots = async (req, res) => {
  try {
    const user = req.user;
    const { search = "", hotelId, masterRoomId, subRoomId, date, priceFrom, priceTo } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = limit && (page - 1) * limit;

    // Base query conditions
    let baseQuery = {};

    // Add date to filter
    if (date) {
      baseQuery.date = date;
    }

    // only superadmin can see inactive rooms
    if (user?.role !== "superAdmin") {
      baseQuery.isActive = true;
      baseQuery.isDeleted = false;
    }

    // Add multiple hotelId filter
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

    // Add multiple masterRoomId filter
    if (masterRoomId) {
      // Split comma-separated IDs if present
      const masterRoomIdArray = masterRoomId.includes(",") ? masterRoomId.split(",") : [masterRoomId];

      // Convert valid strings to ObjectIds
      const validMasterRoomIds = masterRoomIdArray
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validMasterRoomIds.length > 0) {
        baseQuery.masterRoomId = { $in: validMasterRoomIds };
      }
    }

    // Add multiple subRoomId filter
    if (subRoomId) {
      const subRoomIdArray = subRoomId.includes(",") ? subRoomId.split(",") : [subRoomId];

      const validSubRoomIds = subRoomIdArray
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validSubRoomIds.length > 0) {
        baseQuery.subRoomId = { $in: validSubRoomIds };
      }
    }

    // Add search functionality if search parameter is provided
    if (search) {
      baseQuery.$or = [{ "hotelDetails.name": { $regex: search, $options: "i" } }];
    }

    //filter with price
    if (priceFrom && priceTo) {
      baseQuery.price = {
        $gte: priceFrom,
        $lte: priceTo,
      };
    }

    const resultLength = await slotModel.countDocuments(baseQuery);

    const results = await slotModel.find(baseQuery).skip(skip).limit(limit);

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
          ...(priceFrom && priceTo ? { priceFrom, priceTo } : {}),
          ...(date ? { date } : {}),
          ...(hotelId ? { hotelId } : {}),
          ...(masterRoomId ? { masterRoomId } : {}),
          ...(subRoomId ? { subRoomId } : {}),
        },
      },
    });
  } catch (error) {
    console.error("Get all slots error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};
