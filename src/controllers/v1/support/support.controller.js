const SupportTicketModel = require("../../../models/support/support.model");
const userModel = require("../../../models/user/user.model");
const mongoose = require("mongoose");
const { sendNotification } = require("../../../utils/sendNotification");

// ✅ Create a new support ticket with auto assign to available agent
// 💛 send notification to agent
exports.createTicket = async (req, res) => {
  try {
    const { customerId, bookingId, category, description, priority, attachments } = req.body;

    // Validate required fields
    if (!customerId || !category || !description) {
      return res.status(400).json({
        success: false,
        error: "Please provide customerId, category, and description",
      });
    }

    // Validate customerId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid customer ID format",
      });
    }

    // Validate bookingId if provided
    if (bookingId && !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid booking ID format",
      });
    }

    // Validate category
    const validCategories = ["Booking", "HotelExperience", "StaffService", "Payment", "Technical", "Other"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
      });
    }

    // Create new ticket
    const ticket = await SupportTicket.create({
      customerId,
      bookingId,
      category,
      description,
      priority: priority || "medium",
      attachments: attachments || [],
    });

    // Try to auto-assign the ticket to an available support agent
    try {
      const availableAgent = await userModel.findOne({
        role: "supportAgent",
        isActive: true,
        isDeleted: false,
        supportAgentStatus: "available",
      });

      if (availableAgent) {
        // Update ticket with assigned agent and status
        const updatedTicket = await SupportTicket.findByIdAndUpdate(
          ticket._id,
          {
            assignedTo: availableAgent._id,
            status: "in_progress",
          },
          { new: true, runValidators: true }
        );

        // Update agent's status
        await userModel.findByIdAndUpdate(availableAgent._id, { supportAgentStatus: "busy" }, { new: true });

        // Populate the updated ticket
        const populatedTicket = await SupportTicket.findById(updatedTicket._id)
          .populate("customerDetails", "name email")
          .populate("bookingDetails", "bookingNumber checkInDate checkOutDate")
          .populate("assignedStaffDetails", "name email")
          .lean();

        // 💛 send notification to agent // 💛 test panding with FCM
        const notificationToAgent = await sendNotification(
          availableAgent._id,
          "User",
          customerId,
          "Customer",
          `You have been assigned a new support ticket.`,
          "supportTicket"
        );

        console.log("notificationToAgent", notificationToAgent);

        return res.status(201).json({
          success: true,
          data: populatedTicket,
          message: `Ticket created and assigned to an available support agent,\n Agent Name : ${availableAgent.name}  Agent Email : ${availableAgent.email} `,
        });
      }
    } catch (error) {
      console.error("Auto-assignment error:", error);
      // Continue with unassigned ticket if auto-assignment fails
    }

    // If no agent was available or auto-assignment failed, return the unassigned ticket
    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate("customerDetails", "name email")
      .populate("bookingDetails", "bookingNumber checkInDate checkOutDate")
      .lean();

    res.status(201).json({
      success: true,
      data: populatedTicket,
      message: "Ticket created but no available support agent found",
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Get ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ticket ID format",
      });
    }

    const ticket = await SupportTicket.findById(id)
      .populate("customerDetails", "name email")
      .populate("bookingDetails", "bookingNumber checkInDate checkOutDate")
      .populate("assignedStaffDetails", "name email")
      .lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: "Ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error("Get ticket by ID error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Update ticket
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ticket ID format",
      });
    }

    // Validate bookingId if provided
    if (updateData.bookingId && !mongoose.Types.ObjectId.isValid(updateData.bookingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid booking ID format",
      });
    }

    // Validate category if provided
    if (updateData.category) {
      const validCategories = ["Booking", "HotelExperience", "StaffService", "Payment", "Technical", "Other"];
      if (!validCategories.includes(updateData.category)) {
        return res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        });
      }
    }

    const ticket = await SupportTicket.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("customerDetails", "name email")
      .populate("bookingDetails", "bookingNumber checkInDate checkOutDate")
      .populate("assignedStaffDetails", "name email")
      .lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: "Ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Update ticket error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

// ✅ Delete ticket (multiple delete)
exports.deleteTicket = async (req, res) => {
  try {
    const user = req.user;
    const { ids } = req.params;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: "Please provide ids",
      });
    }

    // only superadmin can delete tickets
    if (user?.role !== "superAdmin") {
      return res.status(400).json({
        success: false,
        error: "You are not authorized to delete tickets",
      });
    }

    const ticketIds = ids.includes(",") ? ids.split(",") : [ids];

    // Convert valid strings to ObjectIds
    const validObjectIds = ticketIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => new mongoose.Types.ObjectId(id.trim()));

    const tickets = await SupportTicket.deleteMany({ _id: { $in: validObjectIds } });

    if (!tickets) {
      return res.status(404).json({
        success: false,
        error: "Tickets not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tickets deleted successfully",
      data: tickets,
    });
  } catch (error) {
    console.error("Delete tickets error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

  // ✅ Get all tickets with optional filters
  exports.getAllTickets = async (req, res) => {
    try {
      const { search = "", status, category, priority, startDate, endDate, hotelId, customerId } = req.query;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit);
      const skip = limit && (page - 1) * limit;

      // Base query conditions
      let baseQuery = {};

      // Add hotelId filter
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

      // Add customerId filter
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

      // Add status filter
      if (status) {
        baseQuery.status = status;
      }

      // Add category filter
      if (category) {
        baseQuery.category = category;
      }

      // Add priority filter
      if (priority) {
        baseQuery.priority = priority;
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

      // Add search functionality if search parameter is provided
      if (search) {
        baseQuery.$or = [
          { description: { $regex: search, $options: "i" } },
          { "customer.name": { $regex: search, $options: "i" } },
        ];
      }

      const resultLength = await SupportTicket.countDocuments(baseQuery);

      const results = await SupportTicket.find(baseQuery).skip(skip).limit(limit);

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
            ...(category ? { category } : {}),
            ...(priority ? { priority } : {}),
            ...(startDate && endDate ? { startDate, endDate } : {}),
            ...(hotelId ? { hotelId } : {}),
            ...(customerId ? { customerId } : {}),
          },
        },
      });
    } catch (error) {
      console.error("Get all tickets error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Server Error",
      });
    }
  };

  // ✅ Assign ticket to support agent
  exports.assignTicket = async (req, res) => {
    try {
      const { ticketId, userId } = req.params;

      // Validate ticket ID
      if (!mongoose.Types.ObjectId.isValid(ticketId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid support ticket ID format or user ID format",
        });
      }

      // Check if user exists and is a support agent
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      if (user.role !== "supportAgent") {
        return res.status(400).json({
          success: false,
          error: "User is not a support agent",
        });
      }

      // only superadmin can assign ticket to support agent
      if (user?.role !== "superAdmin") {
        return res.status(400).json({
          success: false,
          error: "You are not authorized to assign ticket to support agent",
        });
      }

      // only active and not deleted support agent can be assigned to ticket
      if (!user.isActive || user.isDeleted) {
        return res.status(400).json({
          success: false,
          error: "Support agent is not active or deleted",
        });
      }

      if (user.supportAgentStatus !== "available") {
        return res.status(400).json({
          success: false,
          error: "Support agent is not available",
        });
      }

      // Update ticket and user status
      const ticket = await SupportTicketModel.findByIdAndUpdate(
        ticketId,
        {
          assignedTo: userId,
          status: "in_progress",
        },
        { new: true, runValidators: true }
      );

      const updatedUser = await userModel.findByIdAndUpdate(userId, { supportAgentStatus: "busy" }, { new: true });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: "Support ticket not found",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          ticket,
          agentStatus: updatedUser.supportAgentStatus,
        },
      });
    } catch (error) {
      console.error("Assign ticket error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Server Error",
      });
    }
  };

  // ✅ Auto assign ticket to available agent
  exports.autoAssignTicket = async (req, res) => {
    try {
      const { ticketId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid support ticket ID format",
        });
      }

      // Find an available support agent
      const availableAgent = await userModel.findOne({
        role: "supportAgent",
        isActive: true,
        isDeleted: false,
        supportAgentStatus: "available",
      });

      if (!availableAgent) {
        return res.status(404).json({
          success: false,
          error: "No available support agents found",
        });
      }

      // Update ticket and agent status
      const [ticket, updatedAgent] = await Promise.all([
        SupportTicket.findByIdAndUpdate(
          ticketId,
          {
            assignedTo: availableAgent._id,
            status: "in_progress",
          },
          { new: true, runValidators: true }
        )
          .populate("customerDetails", "name email")
          .populate("bookingDetails", "bookingNumber checkInDate checkOutDate")
          .populate("assignedStaffDetails", "name email")
          .lean(),
        userModel.findByIdAndUpdate(availableAgent._id, { supportAgentStatus: "busy" }, { new: true }),
      ]);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: "Support ticket not found",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          ticket,
          agent: updatedAgent,
        },
      });
    } catch (error) {
      console.error("Auto assign ticket error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Server Error",
      });
    }
  };

  // ✅ Update ticket status and agent status
  // 💛 send notification to customer
  exports.updateTicketStatus = async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid support ticket ID format",
        });
      }

      if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Invalid status. Must be one of: open, in_progress, resolved, closed",
        });
      }

      const ticket = await SupportTicket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: "Support ticket not found",
        });
      }

      // If ticket is being resolved or closed, update agent status
      if (status === "resolved" || status === "closed") {
        if (ticket.assignedTo) {
          await User.findByIdAndUpdate(ticket.assignedTo, {
            supportAgentStatus: "available",
          });
        }
      }

      const updatedTicket = await SupportTicket.findByIdAndUpdate(
        ticketId,
        { status },
        { new: true, runValidators: true }
      )
        .populate("customerDetails", "name email")
        .populate("bookingDetails", "bookingNumber checkInDate checkOutDate")
        .populate("assignedStaffDetails", "name email")
        .lean();

      // 💛 send notification to customer // 💛 test panding with FCM
      const notificationToCustomer = await sendNotification(
        ticket.customerId,
        "Customer",
        ticket.assignedTo,
        "User",
        `Your ticket updated to ${status}`,
        "supportTicket"
      );

      console.log("notificationToCustomer", notificationToCustomer);

      res.status(200).json({
        success: true,
        data: updatedTicket,
      });
    } catch (error) {
      console.error("Update ticket status error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Server Error",
      });
    }
  };
