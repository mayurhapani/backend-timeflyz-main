const Stripe = require("stripe");
//stripe secret key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

//stripe payment
exports.stripePayment = async (amount, currency) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return { clientSecret: paymentIntent.client_secret };
  } catch (err) {
    return { error: err.message };
  }
};
