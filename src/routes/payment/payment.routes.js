const express = require("express");
const router = express.Router();

const { stripePayment, stripeWebhook } = require("../../controllers/v1/payment/stripePayment.controller");
// 💛 get payment from customer
router.post("/recive", stripePayment);

// 💛  webhook
router.post("/webhook", stripeWebhook);

module.exports = router;
