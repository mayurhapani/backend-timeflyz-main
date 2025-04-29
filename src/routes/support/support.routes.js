const express = require("express");
const router = express.Router();
const {
  createTicket,
  getTicketById,
  updateTicket,
  deleteTicket,
  getAllTickets,
  assignTicket,
  updateTicketStatus,
  autoAssignTicket,
} = require("../../controllers/v1/support/support.controller");
const isSuperAdmin = require("../../middleware/isSuperAdmin.middleware");
const isSupportAgent = require("../../middleware/isSupportAgent.middleware");

// ✅ Create a new support ticket with auto assign to available agent
// 💛 send notification to agent
router.post("/create", createTicket);

// ✅ Get ticket by ID
router.get("/get/:id", getTicketById);

// ✅ Update ticket
router.put("/update/:id", isSuperAdmin, updateTicket);

// ✅ Delete tickets (multiple delete)
router.delete("/delete/:ids", isSuperAdmin, deleteTicket);

// ✅ Get all tickets with optional filters and pagination
router.get("/getAll", isSupportAgent, getAllTickets);

// ✅ Assign ticket to support agent
router.put("/assignTicket/:ticketId/:userId", isSupportAgent, assignTicket);

// ✅ Auto assign ticket to available agent
router.put("/autoAssign/:ticketId", isSuperAdmin, autoAssignTicket);

// ✅ Update ticket status
// 💛 send notification to customer
router.put("/statusUpdate/:ticketId", isSupportAgent, updateTicketStatus);

module.exports = router;
