const notificationModel = require("../models/notification/notification.model");
const { emitToId } = require("../cofig/socket.config");
const fcmTokenModel = require("../models/fcmToken/fcmToken.model");
const { sendToDevice } = require("../cofig/fireBase.config");

exports.sendNotification = async (receiverId, receiverModel, senderId, senderModel, message, type) => {
  const notification = await notificationModel.create({
    receiverId,
    receiverModel,
    senderId,
    senderModel,
    message,
    type,
  });

  emitToId(receiverId, "notification", notification);

  // Send FCM notification
  const tokens = [];
  if (receiverId) {
    tokens = await fcmTokenModel.find({ userId: receiverId }).distinct("fcmToken");
  } else {
    tokens = await fcmTokenModel.find({}).distinct("fcmToken");
  }

  // sendNotification
  if (tokens.length > 0) {
    // build the common notification payload
    const payload = {
      notification: {
        title: "New Notification",
        body: message,
      },
    };
    const responses = await sendToDevice(tokens, payload);
    console.log("sendNotification", responses);
  } else {
    console.log("No tokens found");
  }

  return notification;
};
