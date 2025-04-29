const mongoose = require("mongoose");
const bookingModel = require("../../../models/booking/booking.model");
const slotModel = require("../../../models/slot/slot.model");
const { sendMail } = require("../../../utils/sendMail");
const customerModel = require("../../../models/customer/customer.model");

// 💛 Create a new booking  // 💛 send notification panding
exports.createBooking = async (req, res) => {
  try {
    const {
      customerId,
      hotelId,
      startTime,
      endTime,
      slotPrice,
      slotDuration,
      bookingDate,
      checkInDate,
      guests,
      totalPrice,
      paymentType,
      specialRequests = "",
    } = req.body;

    // Validate required fields
    if (
      !customerId ||
      !hotelId ||
      !startTime ||
      !endTime ||
      !slotPrice ||
      !slotDuration ||
      !bookingDate ||
      !checkInDate ||
      !guests ||
      !totalPrice ||
      !paymentType
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Please provide all required fields: customerId, hotelId, startTime, endTime, slotPrice, slotDuration, bookingDate, checkInDate, guests, totalPrice, and paymentType",
      });
    }

    // Validate if IDs are valid MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ID format for customer, hotel, slot or room",
      });
    }

    // Create new booking
    const newBooking = await bookingModel.create({
      customerId,
      hotelId,
      startTime,
      endTime,
      slotPrice,
      slotDuration,
      bookingDate,
      checkInDate,
      guests,
      totalPrice,
      paymentType,
      specialRequests,
    });

    //add booking to custmer booking history
    const custmer = await customerModel.findByIdAndUpdate(
      customerId,
      { $push: { bookingHistory: newBooking._id } },
      { new: true }
    );

    // Populate the booking with details
    const populatedBooking = await bookingModel
      .findById(newBooking._id)
      .populate("customerDetails", "name email phone")
      .populate("hotelDetails", "name city")
      .lean();

    // 💛 payment api panding

    // // ✅ send email to customer
    // if (populatedBooking.customerDetails.email) {
    //   const customerEmailResponse = await sendMail({
    //     to: populatedBooking.customerDetails.email,
    //     subject: "New booking request",
    //     text: `New booking request for ${populatedBooking.hotelDetails.name}`,
    //     html: `
    //       <p>Hello ${populatedBooking.customerDetails.name},</p>
    //       <p>Your booking request has been received. We will notify you once it is confirmed.</p>
    //       <p>Thank you for choosing ${populatedBooking.hotelDetails.name}.</p>
    //     `,
    //   });

    //   console.log("customerEmailResponse", customerEmailResponse);
    // }

    // // ✅ send email to hotel
    // if (populatedBooking.hotelDetails.email) {
    //   const hotelEmailResponse = await sendMail({
    //     to: populatedBooking.hotelDetails.email,
    //     subject: "New booking request",
    //     text: `New booking request from ${populatedBooking.customerDetails.name}`,
    //     html: `
    //       <p>Hello ${populatedBooking.hotelDetails.name},</p>
    //       <p>A new booking request has been made by ${populatedBooking.customerDetails.name}.</p>
    //       <p>Please review the request and confirm or reject it.</p>
    //     `,
    //   });

    //   console.log("hotelEmailResponse", hotelEmailResponse);
    // }

    // // 💛 send notification to customer // 💛 test panding with FCM
    // const notificationToCustomer = await sendNotification(
    //   populatedBooking.customerDetails._id,
    //   "Customer",
    //   populatedBooking.hotelDetails._id,
    //   "Hotel",
    //   `New booking request for ${populatedBooking.hotelDetails.name}`,
    //   "newBookingRequest"
    // );

    // // 💛 send notification to hotel // 💛 test panding with FCM
    // const notificationToHotel = await sendNotification(
    //   populatedBooking.hotelDetails._id,
    //   "Hotel",
    //   populatedBooking.customerDetails._id,
    //   "Customer",
    //   `New booking request from ${populatedBooking.customerDetails.name}`,
    //   "newBookingRequest"
    // );

    // console.log("notificationToCustomer", notificationToCustomer);
    // console.log("notificationToHotel", notificationToHotel);

    res.status(201).json({
      success: true,
      data: { booking: populatedBooking, customerHistory: custmer.bookingHistory },
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// 💛 booking confirmation // 💛 check payment status // 💛 send notification panding
exports.bookingConfirmation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, slotId } = req.body;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid booking ID format",
      });
    }

    // Validate room ID
    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid slot ID format",
      });
    }

    // Find the booking
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    if (booking.bookingStatus === "booked") {
      return res.status(400).json({
        success: false,
        error: "Booking is already booked",
      });
    }

    //assign slot to booking
    const slot = await slotModel.findById(slotId);
    if (!slot) {
      return res.status(400).json({
        success: false,
        error: "slot not found",
      });
    }

    slot.isAvailable = false;
    await room.save();

    // booking.roomId = roomId;
    // await booking.save();

    // Validate status
    if (!["booked", "cancelled", "completed", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be either 'booked', 'cancelled', 'completed', or 'pending'",
      });
    }

    //TODO: ⭕⭕❌❌⭕⭕ change to payment confirmation before booking confirmation
    booking.paymentStatus = "paid";

    // Update booking status if payment is successful
    if (booking.paymentStatus === "pending") {
      return res.status(400).json({
        success: false,
        error: "Payment is pending",
      });
    }

    booking.bookingStatus = status;
    await booking.save();

    // 💛 test panding
    if (status === "booked") {
      // 💛 send notification to customer // 💛 test panding
      sendNotification(
        booking.customerId,
        "Customer",
        booking.hotelId,
        "Hotel",
        ` Your booking has been confirmed,
          your booking id is ${booking._id},
          your room is ${room.roomNumber}, 
          your check in date is ${booking.checkInDate}, 
          your check out date is ${booking.checkOutDate}, 
          your total price is ${booking.totalPrice}, 
          your payment type is ${booking.paymentType}, 
          your special requests are ${booking.specialRequests}`,
        "bookingConfirmation"
      );

      // ✅ send email to customer
      if (booking.customerDetails.email) {
        const customerEmailResponse = await sendMail({
          to: booking.customerDetails.email,
          subject: "Booking confirmed",
          text: `Your booking has been confirmed,
          your booking id is ${booking._id},
          your room is ${room.roomNumber}, 
          your check in date is ${booking.checkInDate}, 
          your check out date is ${booking.checkOutDate}, 
          your total price is ${booking.totalPrice}, 
          your payment type is ${booking.paymentType}, 
          your special requests are ${booking.specialRequests}`,
        });
      }
    } else {
      // 💛 send notification to customer // 💛 test panding
      sendNotification(
        booking.customerId,
        "Customer",
        booking.hotelId,
        "Hotel",
        `Your booking status has been updated to ${status}`,
        "bookingCancellation"
      );

      // ✅ send email to customer
      if (booking.customerDetails.email) {
        const customerEmailResponse = await sendMail({
          to: booking.customerDetails.email,
          subject: "Booking status updated",
          text: `Your booking status has been updated to ${status}`,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: { booking, status },
    });
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Get single booking
exports.getBooking = async (req, res) => {
  try {
    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid booking ID format",
      });
    }

    const booking = await bookingModel
      .findById(req.params.id)
      .populate("customerDetails", "name email phone")
      .populate("hotelDetails", "name city")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Update booking
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      guests,
      totalPrice,
      specialRequests,
      paymentType,
      paymentStatus,
      paymentIntentId,
      paymentDate,
      bookingStatus,
    } = req.body;

    // Validate if id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid booking ID format",
      });
    }

    // Check if booking exists
    const existingBooking = await bookingModel.findById(id);
    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    // Create payload as per the fields that are provided
    const payload = {
      guests,
      totalPrice,
      specialRequests,
    };

    if (paymentStatus) {
      payload.paymentStatus = paymentStatus;
    }
    if (paymentType) {
      payload.paymentType = paymentType;
    }
    if (paymentIntentId) {
      payload.paymentIntentId = paymentIntentId;
    }
    if (paymentDate) {
      payload.paymentDate = paymentDate;
    }

    if (bookingStatus) {
      payload.bookingStatus = bookingStatus;
    }

    // Update booking
    const booking = await bookingModel
      .findByIdAndUpdate(id, payload, { new: true, runValidators: true })
      .populate("customerDetails", "name email phone")
      .populate("hotelDetails", "name city")
      .lean();

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Delete booking (multiple delete)
exports.deleteBooking = async (req, res) => {
  try {
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    const bookingIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = bookingIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    const bookings = await bookingModel.deleteMany({ _id: { $in: validObjectIds } });

    if (!bookings) {
      return res.status(404).json({
        success: false,
        error: "Bookings not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bookings deleted successfully",
      data: bookings,
    });
  } catch (error) {
    console.error("Delete bookings error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const { search = "", status, startDate, endDate, hotelId, customerId } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = limit && (page - 1) * limit;

    // Base query conditions
    let baseQuery = {};

    // Add status filter
    if (status) {
      baseQuery.status = status;
    }

    // Add date range filter
    if (startDate && endDate) {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          baseQuery.checkInDate = {
            $gte: start,
            $lte: end,
          };
        }
      } catch (dateError) {
        console.error("Date parsing error:", dateError);
      }
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

    // Add multiple customerId filter
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

    // Add search functionality if search parameter is provided
    if (search) {
      baseQuery.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "hotel.name": { $regex: search, $options: "i" } },
      ];
    }

    const resultLength = await bookingModel.countDocuments(baseQuery);

    const results = await bookingModel.find(baseQuery).skip(skip).limit(limit);

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
          ...(status ? { status } : {}),
          ...(startDate && endDate ? { startDate, endDate } : {}),
          ...(hotelId ? { hotelId } : {}),
          ...(customerId ? { customerId } : {}),
        },
      },
    });
  } catch (error) {
    console.error("Get all bookings error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// 💛 Customer requests to cancel a booking // 💛 send notification panding
exports.requestBookingCancellation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid booking ID format",
      });
    }

    // Find the booking
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    // Check if booking is already cancelled
    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        error: "Booking is already cancelled",
      });
    }

    // Check if cancellation is already requested
    if (booking.cancellationRequest.requested) {
      return res.status(400).json({
        success: false,
        error: "Cancellation already requested",
        currentStatus: booking.cancellationRequest.status,
      });
    }

    // Update booking with cancellation request
    booking.cancellationRequest = {
      requested: true,
      status: "pending",
      message: reason || "",
      requestedAt: new Date(),
    };

    await booking.save();

    // Get updated booking with populated details
    const updatedBooking = await bookingModel
      .findById(bookingId)
      .populate("customerDetails", "name email")
      .populate("hotelDetails", "name")
      .populate("slotDetails", "startTime endTime duration price")
      .lean();

    // 💛 send notification to hotel // 💛 test panding with FCM
    const notificationToHotel = await sendNotification(
      updatedBooking.hotelDetails._id,
      "Hotel",
      updatedBooking.customerDetails._id,
      "Customer",
      `New cancellation request from ${updatedBooking.customerDetails.name}`,
      "newBookingCancellation"
    );

    console.log("notificationToHotel", notificationToHotel);

    // ✅ send email to hotel
    if (updatedBooking.hotelDetails.email) {
      const hotelEmailResponse = await sendMail({
        to: updatedBooking.hotelDetails.email,
        subject: "New cancellation request",
        text: `New cancellation request from ${updatedBooking.customerDetails.name}`,
        html: `
          <p>Hello ${updatedBooking.hotelDetails.name},</p>
          <p>A new cancellation request has been made by ${updatedBooking.customerDetails.name}.</p>
        `,
      });
    }

    res.status(200).json({
      success: true,
      message: "Cancellation request submitted successfully",
      data: {
        booking: updatedBooking,
        cancellationRequest: updatedBooking.cancellationRequest,
      },
    });
  } catch (error) {
    console.error("Request booking cancellation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// 💛 Hotel responds to cancellation request // 💛 send notification panding
exports.respondToCancellationRequest = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, message } = req.body;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid booking ID format",
      });
    }

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be either 'approved' or 'rejected'",
      });
    }

    // Find the booking
    const booking = await bookingModel.findById(bookingId).populate("slotDetails");
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found",
      });
    }

    // Check if cancellation was requested
    if (!booking.cancellationRequest.requested) {
      return res.status(400).json({
        success: false,
        error: "No cancellation request found for this booking",
      });
    }

    // Check if already responded
    if (booking.cancellationRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Cancellation request already processed",
        currentStatus: booking.cancellationRequest.status,
      });
    }

    // Update booking status based on response
    booking.cancellationRequest.status = status;
    booking.cancellationRequest.message = message || "";
    booking.cancellationRequest.respondedAt = new Date();

    if (status === "approved") {
      booking.bookingStatus = "cancelled";
      booking.paymentStatus = "cancelled";
      booking.slotDetails.isAvailable = true;
      await booking.slotDetails.save();
    }

    await booking.save();

    // Get updated booking with populated details
    const updatedBooking = await bookingModel
      .findById(bookingId)
      .populate("customerDetails", "name email")
      .populate("hotelDetails", "name")
      .populate("slotDetails", "startTime endTime duration price isAvailable")
      .lean();

    // 💛 send notification to customer // 💛 test panding with FCM
    sendNotification(
      updatedBooking.customerDetails._id,
      "Customer",
      updatedBooking.hotelDetails._id,
      "Hotel",
      `Your cancellation request has been ${status}`,
      "newBookingCancellation"
    );

    // ✅ send email to customer
    if (updatedBooking.customerDetails.email) {
      const customerEmailResponse = await sendMail({
        to: updatedBooking.customerDetails.email,
        subject: "Cancellation request",
        text: `Your cancellation request has been ${status}`,
        html: `
          <p>Hello ${updatedBooking.customerDetails.name},</p>
          <p>Your cancellation request has been ${status}.</p>
          <p>Thank you for choosing ${updatedBooking.hotelDetails.name}.</p>
        `,
      });
    }

    res.status(200).json({
      success: true,
      message: `Cancellation request ${status}`,
      data: {
        booking: updatedBooking,
        cancellationRequest: updatedBooking.cancellationRequest,
      },
    });
  } catch (error) {
    console.error("Respond to cancellation request error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};
