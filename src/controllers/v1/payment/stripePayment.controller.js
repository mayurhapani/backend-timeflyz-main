const Stripe = require("stripe");
const bookingModel = require("../../../models/booking/booking.model");
const { sendMail } = require("../../../utils/sendMail");
const { sendNotification } = require("../../../utils/sendNotification");
//stripe secret key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// 💛 stripe payment
exports.stripePayment = async (req, res) => {
  try {
    const { amount, currency } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 💛  webhook
exports.stripeWebhook = async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const bookingId = intent.metadata.bookingId;

    // 1. Update booking status
    const updated = await bookingModel.findByIdAndUpdate(
      bookingId,
      {
        paymentStatus: "paid",
        paymentIntentId: intent.id,
      },
      { new: true }
    );

    // 2. Populate and send emails & notifications
    const populatedBooking = await bookingModel
      .findById(bookingId)
      .populate("customerDetails", "name email")
      .populate("hotelDetails", "name email")
      .populate({
        path: "slotDetails",
        populate: [{ path: "subRoomDetails" }, { path: "masterRoomDetails" }],
      });

    // sendMail(...) to customer and hotel
    // sendNotification(...) to customer/hotel via socket & FCM

    // ✅ send email to customer
    if (populatedBooking?.customerDetails?.email) {
      const customerEmailResponse = await sendMail({
        to: populatedBooking?.customerDetails?.email,
        subject: "New booking request",
        text: `New booking request for ${populatedBooking?.hotelDetails?.name}`,
        html: `
         <div style="margin: 0; padding: 0; background-color: #eeeeee; font-family: Arial, sans-serif;">
            <div
              style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); overflow: hidden;">

              <!-- Header -->
              <div style="background-color: #f5f5f5; padding: 20px; display: flex; align-items: center;">
                <img src="https://yourcompany.com/logo.png" alt="Company Logo" style="height: 40px; margin-right: 15px;" />
                <h1 style="margin: 0; font-size: 20px; color: #333;">Your Company Name</h1>
              </div>

              <!-- Main Content -->
              <div style="padding: 30px;">
                <h2 style="color: #2c3e50;">Booking Request Received at ${populatedBooking.hotelDetails.name}</h2>

                <p>Hi ${populatedBooking.customerDetails.name},</p>

                <p>Thank you for choosing <strong>${
                  populatedBooking.hotelDetails.name
                }</strong>. We’ve received your booking
                  request and it’s now being processed.</p>

                <!-- Booking Summary -->
                <h3 style="color: #2c3e50; margin-top: 30px;">📋 Booking Summary</h3>
                <ul style="padding-left: 20px; line-height: 1.7;">
                  <li><strong>Hotel:</strong> ${populatedBooking.hotelDetails.name}</li>
                  <li><strong>Room:</strong> ${
                    populatedBooking.slotDetails?.masterRoomDetails?.masterRoomName || "Room details unavailable"
                  }
                  </li>
                  <li><strong>Check-in:</strong> ${new Date(populatedBooking.checkInDate).toLocaleDateString()}</li>
                  <li><strong>Check-out:</strong> ${new Date(populatedBooking.checkOutDate).toLocaleDateString()}</li>
                  <li><strong>Guests:</strong> ${populatedBooking.guests || "N/A"}</li>
                  <li><strong>Special Requirements:</strong> ${populatedBooking?.specialRequests || "None"}</li>
                </ul>

                <!-- Payment & Slot Info -->
                <h3 style="color: #2c3e50; margin-top: 30px;">💳 Payment & Slot Details</h3>
                <ul style="padding-left: 20px; line-height: 1.7;">
                  <li><strong>Payment Status:</strong> ${populatedBooking?.paymentStatus || "Pending"}</li>
                  <li><strong>Total Amount:</strong> ₹${populatedBooking?.totalPrice || "0.00"}</li>
                  <li><strong>Payment Date:</strong> ${
                    new Date(populatedBooking?.paymentDate).toLocaleDateString() || "—"
                  }</li>
                  <li><strong>Slot ID:</strong> ${populatedBooking?.slotId || "Not assigned yet"}</li>
                  <li><strong>Slot Time:</strong> ${populatedBooking?.slotTime || "—"}</li>
                  <li><strong>Duration:</strong> ${
                    populatedBooking?.slotDetails?.subRoomDetails?.duration
                      ? populatedBooking?.slotDetails?.subRoomDetails?.duration + " hrs"
                      : "—"
                  }</li>
                </ul>

                <p>If you have any questions, feel free to reply to this email or contact our support team.</p>

                <p style="margin-top: 30px;">Warm regards,<br /><strong>${
                  populatedBooking.hotelDetails.name
                } Team</strong></p>
              </div>

              <!-- Footer -->
              <div style="background-color: #fafafa; padding: 20px; font-size: 12px; color: #888; text-align: center;">
                <p>This is an automated message. Please do not reply directly to this email.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
                <p><strong>Terms & Conditions:</strong><br />
                  All bookings are subject to availability. Cancellations must be made at least 24 hours in advance to avoid
                  charges. Prices may vary due to dynamic pricing. By booking, you agree to our policies.
                </p>
              </div>

            </div>
          </div>
        `,
      });

      console.log("customerEmailResponse", customerEmailResponse);
    }

    // ✅ send email to hotel
    if (populatedBooking?.hotelDetails?.email) {
      const hotelEmailResponse = await sendMail({
        to: populatedBooking?.hotelDetails?.email,
        subject: "New booking request",
        text: `New booking request from ${populatedBooking?.customerDetails?.name}`,
        html: `
          <p>Hello ${populatedBooking.hotelDetails.name},</p>
          <p>A new booking request has been made by ${populatedBooking.customerDetails.name}.</p>
          <p>Please review the request and confirm or reject it.</p>
        `,
      });

      console.log("hotelEmailResponse", hotelEmailResponse);
    }

    // 💛 send notification to customer // 💛 test panding with FCM
    const notificationToCustomer = await sendNotification(
      populatedBooking.customerDetails._id,
      "Customer",
      populatedBooking.hotelDetails._id,
      "Hotel",
      `New booking request for ${populatedBooking.hotelDetails.name}`,
      "newBookingRequest"
    );

    // 💛 send notification to hotel // 💛 test panding with FCM
    const notificationToHotel = await sendNotification(
      populatedBooking.hotelDetails._id,
      "Hotel",
      populatedBooking.customerDetails._id,
      "Customer",
      `New booking request from ${populatedBooking.customerDetails.name}`,
      "newBookingRequest"
    );

    console.log("notificationToCustomer", notificationToCustomer);
    console.log("notificationToHotel", notificationToHotel);
  }
  res.json({ received: true });
};
