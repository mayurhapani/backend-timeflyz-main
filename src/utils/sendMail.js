const sgMail = require("@sendgrid/mail");
const twilio = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendMail({ to, subject, text, html }) {
  try {
    await sgMail.send({ to, from: process.env.SENDGRID_FROM_EMAIL, subject, text, html });
  } catch (error) {
    console.error("Error sending email:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw error;
  }
}

async function sendSms({ to, message }) {
  try {
    await twilio.messages.create({ to, from: process.env.TWILIO_FROM_NUMBER, body: message });
  } catch (error) {
    console.error("Error sending sms:", error);
    throw error;
  }
}

module.exports = { sendMail, sendSms };
