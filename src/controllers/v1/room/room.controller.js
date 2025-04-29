const mongoose = require("mongoose");
const masterRoomModel = require("../../../models/room/masterRoom.model");
const subRoomModel = require("../../../models/room/subRooms.model");
const { imageDeleteFromS3 } = require("../../../utils/file upload/imageUploadToS3");
const slotModel = require("../../../models/slot/slot.model");
const hotelModel = require("../../../models/hotel/hotel.model");

// 🟢 master room routes--------------------------------

// Create a new master room
exports.createMasterRoom = async (req, res) => {
  try {
    const { hotelId, masterRoomName, subRooms, fullDayPrice, description, images, capacity, amenities, isActive } =
      req.body;

    if (!hotelId || !subRooms || !masterRoomName || !fullDayPrice) {
      return res.status(400).json({
        success: false,
        error: "Please provide hotelId, subRooms, masterRoomName and fullDayPrice",
      });
    }

    if (!Array.isArray(subRooms)) {
      return res.status(400).json({
        success: false,
        error: "Sub rooms must be an array",
      });
    }

    // Validate if hotelId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid hotel ID format",
      });
    }

    // check if master room already exists
    const existingMasterRoom = await masterRoomModel.findOne({ hotelId, masterRoomName });
    if (existingMasterRoom) {
      return res.status(400).json({
        success: false,
        error: "Master room already exists",
      });
    }

    // 🟢 Create master room ------------------------------------------------------------
    const newMasterRoom = await masterRoomModel.create({
      hotelId,
      masterRoomName,
      fullDayPrice,
      description,
      capacity,
      amenities,
      isActive,
    });

    // 🟢 Create sub rooms ------------------------------------------------------------
    const newSubRooms = await Promise.all(
      subRooms.map(async (room) => {
        const { slotDuration, isAvailable, subRoomName, defaultSlots } = room;

        // Validate required fields
        if (!slotDuration || !subRoomName || !defaultSlots) {
          return res.status(400).json({
            success: false,
            error: "Please provide masterRoomId, slotDuration, subRoomName and defaultSlots",
          });
        }

        // check if defaultSlots is an array
        if (!Array.isArray(defaultSlots)) {
          return res.status(400).json({
            success: false,
            error: "defaultSlots must be an array",
          });
        }

        // Check if room number already exists for this hotel
        const existingSubRoom = await subRoomModel.findOne({
          hotelId,
          masterRoomId: newMasterRoom._id,
          subRoomName,
        });
        if (existingSubRoom) {
          return res.status(400).json({
            success: false,
            error: "Sub room already exists for this hotel",
          });
        }

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

        //add price to default slots with decimal precision
        const updatedDefaultSlots = defaultSlots.map((slot) => ({
          ...slot,
          price: slotPrice.toFixed(2),
        }));

        // Create new room
        const newSubRoom = await subRoomModel.create({
          hotelId,
          masterRoomId: newMasterRoom._id,
          slotDuration,
          isAvailable,
          subRoomName,
          defaultSlots: updatedDefaultSlots,
        });

        return newSubRoom;
      })
    );

    //add sub rooms ids to master room
    newMasterRoom.subRoomIds = newSubRooms.map((subRoom) => subRoom._id);
    await newMasterRoom.save();

    if (images) {
      // upload images to s3
      const uploadedImages = await imageUploadToS3(images, "rooms", newMasterRoom._id);

      // update room with uploaded images
      newMasterRoom.images = uploadedImages;
      await newMasterRoom.save();
    }

    //populate master room with sub rooms
    const populatedMasterRoom = await masterRoomModel
      .findById(newMasterRoom._id)
      .populate("subRoomIds")
      .select("subRoomName defaultSlots slotDuration isAvailable");

    res.status(201).json({
      success: true,
      message: "Master room and sub rooms created successfully",
      data: populatedMasterRoom,
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get single master room
exports.getMasterRoom = async (req, res) => {
  try {
    const user = req.user;
    const room = await masterRoomModel.findById(req.params.id).populate("subRoomIds").lean();

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    // only superadmin can see deleted rooms
    if (room.isDeleted && user.role !== "superAdmin") {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Update master room
exports.updateMasterRoom = async (req, res) => {
  try {
    const user = req.user;
    const { hotelId, masterRoomName, fullDayPrice, description, images, capacity, amenities, isActive, isDeleted } =
      req.body;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid room ID format",
      });
    }

    // Check if room exists
    const existingRoom = await masterRoomModel.findById(req.params.id);
    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    // If master room name is being updated, check if it already exists for this hotel
    if (masterRoomName && masterRoomName !== existingRoom.masterRoomName) {
      const roomWithSameName = await masterRoomModel.findOne({
        hotelId,
        masterRoomName,
        _id: { $ne: req.params.id },
      });

      if (roomWithSameName) {
        return res.status(400).json({
          success: false,
          error: "Master room name already exists for this hotel",
        });
      }
    }

    // only superadmin can update deleted rooms
    if (isDeleted && user.role !== "superAdmin") {
      return res.status(404).json({
        success: false,
        error: "Room not found",
      });
    }

    // Update room
    let updatedRoom = await masterRoomModel
      .findByIdAndUpdate(
        req.params.id,
        {
          hotelId,
          masterRoomName,
          fullDayPrice,
          description,
          capacity,
          amenities,
          isActive,
        },
        { new: true, runValidators: true }
      )
      .populate("subRoomIds")
      .lean();

    //update price in slots
    const updatedSubRooms = await Promise.all(
      updatedRoom.subRoomIds.map(async (subRoomId) => {
        const subRoom = await subRoomModel.findById(subRoomId);
        const { slotDuration, defaultSlots } = subRoom;

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

        //update price in slots
        const updatedDefaultSlots = defaultSlots.map((defaultSlot) => ({
          ...defaultSlot._doc,
          price: slotPrice.toFixed(2),
        }));

        //update sub room
        const updatedSubRoom = await subRoomModel.findByIdAndUpdate(
          subRoomId,
          { defaultSlots: updatedDefaultSlots },
          { new: true }
        );

        return updatedSubRoom;
      })
    );

    updatedRoom.subRoomIds = updatedSubRooms;

    if (images) {
      // upload images to s3
      const uploadedImages = await imageUploadToS3(images, "rooms", room._id);

      // update room with uploaded images
      updatedRoom = await masterRoomModel.findByIdAndUpdate(room._id, { images: uploadedImages }, { new: true });
    }

    res.status(200).json({
      success: true,
      message: "Master room updated successfully",
      data: updatedRoom,
    });
  } catch (error) {
    console.error("Update master room error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Delete master room
exports.deleteMasterRoom = async (req, res) => {
  try {
    const user = req.user;
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    const masterRoomIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = masterRoomIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    if (validObjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid room ID format",
      });
    }

    //only superadmin can delete master room
    if (user.role !== "superAdmin") {
      return res.status(404).json({
        success: false,
        error: "You are not authorized to delete master rooms",
      });
    }

    // Fetch all master rooms
    const masterRoomsToDelete = await masterRoomModel.find({ _id: { $in: validObjectIds } });
    if (masterRoomsToDelete.length !== validObjectIds.length) {
      return res.status(404).json({
        success: false,
        error: "One or more master rooms not found",
      });
    }

    // Delete images for each room
    await Promise.all(
      masterRoomsToDelete.map(async (room) => {
        if (room.images && room.images.length > 0) {
          console.log("Deleting images for room", room._id);
          await imageDeleteFromS3("rooms", room._id.toString());
        }
      })
    );

    // delete sub rooms
    await Promise.all(
      masterRoomsToDelete.map(async (room) => {
        await subRoomModel.deleteMany({ masterRoomId: room._id });
      })
    );

    // delete manual slots
    await Promise.all(
      masterRoomsToDelete.map(async (room) => {
        await slotModel.deleteMany({ masterRoomId: room._id });
      })
    );

    // delete master rooms
    const deleteResult = await masterRoomModel.deleteMany({ _id: { $in: validObjectIds } });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Master rooms not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Master rooms deleted successfully",
      data: deleteResult,
    });
  } catch (error) {
    console.error("Delete master room error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// Get all master rooms
exports.getAllMasterRooms = async (req, res) => {
  try {
    const user = req.user;
    const { search = "", minPrice, maxPrice, capacity, isActive, hotelId } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = limit && (page - 1) * limit;

    let baseQuery = {};

    // Add multiple hotelId filter
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

    // Add price range filter
    if (minPrice || maxPrice) {
      baseQuery.pricePerNight = {};
    }

    // Add capacity filter
    if (capacity) {
      baseQuery.capacity = parseInt(capacity);
    }

    // Add availability filter
    if (isActive !== undefined) {
      baseQuery.isActive = isActive === "true" || isActive === true;
    }

    // only superadmin can see deleted rooms
    if (user?.role !== "superAdmin") {
      baseQuery.isDeleted = false;
    }

    // Add search functionality if search parameter is provided
    if (search) {
      baseQuery.$or = [
        { roomNumber: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const resultLength = await masterRoomModel.countDocuments(baseQuery);

    const results = await masterRoomModel.find(baseQuery).populate("subRoomIds").skip(skip).limit(limit);

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
          ...(minPrice || maxPrice ? { pricePerNight: { $gte: minPrice, $lte: maxPrice } } : {}),
          ...(capacity ? { capacity } : {}),
          ...(isAvailable !== undefined ? { isAvailable } : {}),
        },
      },
    });
  } catch (error) {
    console.error("Get all rooms error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// 🟢 sub room routes--------------------------------

// Create a new sub room
exports.createSubRoom = async (req, res) => {
  try {
    const { hotelId, masterRoomId, subRoomName, defaultSlots, isAvailable, isActive, slotDuration } = req.body;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(hotelId) || !mongoose.Types.ObjectId.isValid(masterRoomId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid room ID format",
      });
    }

    // Check is hotel exists ?
    const existingHotel = await hotelModel.findById(hotelId);
    if (!existingHotel) {
      return res.status(404).json({
        success: false,
        error: "Hotel not found",
      });
    }
    // Check is master room exists ?
    const existingMasterRoom = await masterRoomModel.findById(masterRoomId);
    if (!existingMasterRoom) {
      return res.status(404).json({
        success: false,
        error: "Master room not found",
      });
    }

    // Check if sub room already exists
    const existingSubRoom = await subRoomModel.findOne({ hotelId, masterRoomId, subRoomName });
    if (existingSubRoom) {
      return res.status(400).json({
        success: false,
        error: "Sub room already exists",
      });
    }

    //get fullday price from master room
    const fullDayPrice = existingMasterRoom.fullDayPrice;

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

    //check if default slots is array
    if (!Array.isArray(defaultSlots) || defaultSlots.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Default slots must be a non-empty array",
      });
    }

    //add price to default slots with decimal precision
    const updatedDefaultSlots = defaultSlots.map((slot) => ({
      ...slot,
      price: slotPrice.toFixed(2),
    }));

    // Create new sub room
    const newSubRoom = await subRoomModel.create({
      hotelId,
      masterRoomId,
      subRoomName,
      defaultSlots: updatedDefaultSlots,
      isAvailable,
      slotDuration,
    });

    // add sub room id to master room
    existingMasterRoom.subRoomIds.push(newSubRoom._id);
    await existingMasterRoom.save();

    res.status(201).json({
      success: true,
      message: "Sub room created successfully",
      data: newSubRoom,
    });
  } catch (error) {
    console.error("Create sub room error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// get sub room by id
exports.getSubRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid room ID format",
      });
    }

    // Check if sub room exists
    const existingSubRoom = await subRoomModel.findById(id).populate("masterRoomDetails");
    if (!existingSubRoom) {
      return res.status(404).json({
        success: false,
        error: "Sub room not found",
      });
    }

    // only superadmin can see deleted rooms
    if (existingSubRoom.isDeleted && user?.role !== "superAdmin") {
      return res.status(404).json({
        success: false,
        error: "Sub room not found",
      });
    }

    res.status(200).json({
      success: true,
      data: existingSubRoom,
    });
  } catch (error) {
    console.error("Get sub room error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// update sub room
exports.updateSubRoom = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { hotelId, masterRoomId, subRoomName, defaultSlots, isAvailable, slotDuration, isActive } = req.body;

    // Validate if id is a valid MongoDB ObjectId
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(masterRoomId) ||
      !mongoose.Types.ObjectId.isValid(hotelId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid ID, masterRoomId or hotelId format",
      });
    }

    // Check if sub room exists
    const existingSubRoom = await subRoomModel.findById(id).populate("masterRoomDetails");
    if (!existingSubRoom) {
      return res.status(404).json({
        success: false,
        error: "Sub room not found",
      });
    }

    //update price in slots if slotDuration is changed
    let newUpdatedDefaultSlots = existingSubRoom?.defaultSlots || [];
    if (slotDuration !== existingSubRoom?.slotDuration) {
      const fullDayPrice = existingSubRoom?.masterRoomDetails?.fullDayPrice;
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

      //if new default slots
      let newDefaultSlots = defaultSlots || existingSubRoom?.defaultSlots;

      //if existing default slots
      const updatedDefaultSlots = newDefaultSlots.map((slot) => ({
        ...slot._doc,
        price: slotPrice.toFixed(2),
      }));

      newUpdatedDefaultSlots = updatedDefaultSlots;
    }

    //only superadmin can update deleted   sub rooms
    if (existingSubRoom.isDeleted && user?.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to update deleted sub rooms",
      });
    }

    //craete payload
    const payload = {
      hotelId,
      masterRoomId,
      subRoomName,
      defaultSlots: newUpdatedDefaultSlots,
    };

    if (isAvailable) {
      payload.isAvailable = isAvailable;
    }
    if (slotDuration) {
      payload.slotDuration = slotDuration;
    }
    if (isActive) {
      payload.isActive = isActive;
    }

    //clear undefined values from payload
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    // Update sub room
    const updatedSubRoom = await subRoomModel.findByIdAndUpdate(id, payload, { new: true });

    res.status(200).json({
      success: true,
      data: updatedSubRoom,
      message: "Sub room updated successfully",
    });
  } catch (error) {
    console.error("Update sub room error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// delete sub room
exports.deleteSubRoom = async (req, res) => {
  try {
    const user = req.user;
    const { ids } = req.params;

    const subRoomIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = subRoomIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    if (validObjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid room ID format",
      });
    }

    // only superadmin can delete sub rooms
    if (user?.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to delete sub rooms",
      });
    }

    // Check if multiple sub rooms exists
    const existingSubRoomIds = await subRoomModel.find({ _id: { $in: validObjectIds } }).distinct("_id");
    if (existingSubRoomIds.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Sub room not found",
      });
    }

    // Check if multiple master rooms exists
    const existingMasterRooms = await masterRoomModel.find({
      subRoomIds: { $in: existingSubRoomIds },
    });

    // Remove multiple subRoom IDs from master room's subRooms array
    if (existingMasterRooms) {
      existingMasterRooms.forEach(async (masterRoom) => {
        await masterRoomModel.findByIdAndUpdate(masterRoom._id, {
          $pull: { subRoomIds: { $in: existingSubRoomIds } },
        });
      });
    }

    //remove manual slots from slot model
    const deletedSlots = await slotModel.deleteMany({ subRoomId: { $in: existingSubRoomIds } });

    // Delete multiple sub rooms
    const deletedSubRooms = await subRoomModel.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      data: { deletedSubRooms, deletedSlots },
      message: "Sub rooms deleted successfully",
    });
  } catch (error) {
    console.error("Delete sub room error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// get all sub rooms
exports.getAllSubRooms = async (req, res) => {
  try {
    const user = req.user;
    const { search = "", hotelId, masterRoomId, isAvailable, isActive } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = limit && (page - 1) * limit;

    let baseQuery = {};

    // Add multiple hotelId filter
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

    // Add multiple masterRoomId filter
    if (masterRoomId) {
      const masterRoomIds = masterRoomId.includes(",") ? masterRoomId.split(",") : [masterRoomId];

      // Convert valid strings to ObjectIds
      const validObjectIds = masterRoomIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
        .map((id) => new mongoose.Types.ObjectId(id.trim()));

      if (validObjectIds.length > 0) {
        baseQuery.masterRoomId = { $in: validObjectIds };
      }
    }

    // Add availability filter
    if (isAvailable !== undefined) {
      baseQuery.isAvailable = isAvailable === "true" || isAvailable === true;
    }

    // Add active filter
    if (isActive !== undefined) {
      baseQuery.isActive = isActive === "true" || isActive === true;
    }

    // only superadmin can see deleted rooms
    if (user?.role !== "superAdmin") {
      baseQuery.isDeleted = false;
    }

    // Add search functionality if search parameter is provided
    if (search) {
      baseQuery.$or = [{ subRoomName: { $regex: search, $options: "i" } }];
    }

    const resultLength = await subRoomModel.countDocuments(baseQuery);

    const results = await subRoomModel.find(baseQuery).skip(skip).limit(limit);

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
          ...(masterRoomId ? { masterRoomId } : {}),
          ...(isAvailable !== undefined ? { isAvailable } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      },
    });
  } catch (error) {
    console.error("Get all sub rooms error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};
