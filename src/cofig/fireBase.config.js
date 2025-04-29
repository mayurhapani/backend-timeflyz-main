const admin = require("firebase-admin");
// const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  // credential: admin.credential.cert(serviceAccount),
});

// Add a helper to send messages via Firebase Cloud Messaging
exports.sendToDevice = async (registrationTokens, payload, options = {}) => {
  const responses = [];

  for (const token of registrationTokens) {
    const message = {
      ...payload,
      token: token,
      ...options,
    };

    try {
      const response = await admin.messaging().send(message);
      responses.push({ token, response });
    } catch (error) {
      responses.push({ token, error });
    }
  }

  return responses;
};
