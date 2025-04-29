const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    category: {
      type: String,
      enum: ["Booking", "HotelExperience", "StaffService", "Payment", "Technical", "Other"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    attachments: [
      {
        type: String,
        trim: true,
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
supportTicketSchema.virtual("customerDetails", {
  ref: "Customer",
  localField: "customerId",
  foreignField: "_id",
  justOne: true,
});

supportTicketSchema.virtual("bookingDetails", {
  ref: "Booking",
  localField: "bookingId",
  foreignField: "_id",
  justOne: true,
});

supportTicketSchema.virtual("assignedStaffDetails", {
  ref: "User",
  localField: "assignedTo",
  foreignField: "_id",
  justOne: true,
});

// Pre-save middleware to update resolvedAt
supportTicketSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "resolved") {
    this.resolvedAt = new Date();
  }
  next();
});

// Static method to check if ticket exists
supportTicketSchema.statics.checkTicketExists = async function (ticketId) {
  const ticket = await this.findById(ticketId);
  return !!ticket;
};

const SupportTicketModel = mongoose.model("SupportTicket", supportTicketSchema);

module.exports = SupportTicketModel;
