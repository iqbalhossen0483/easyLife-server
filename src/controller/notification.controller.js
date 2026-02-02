const { Expo } = require("expo-server-sdk");
const { queryDocument } = require("../services/mysql.service");

async function sendNotification(req, res, next) {
  try {
    // Create a new Expo SDK client
    let expo = new Expo();

    let tokens = [];
    const sql = `SELECT pushToken FROM ${req.query.db}.users WHERE ${
      req.body.data.toUser
        ? `id = '${req.body.data.toUser}'`
        : `id != '${req.body.data.id}' ${
            req.body.data.admin ? " AND designation != 'Admin'" : ""
          }`
    }`;
    const data = await queryDocument(sql);
    for (const token of data) {
      if (token.pushToken) {
        tokens.push(token.pushToken);
      }
    }

    // Create the messages that you want to send to clents
    let messages = [];
    for (let pushToken of tokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: "default",
        title: req.body.title,
        body: req.body.body,
        data: req.body.data,
      });
    }

    let chunks = expo.chunkPushNotifications(messages);

    (async () => {
      for (let chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);

          res.send({ message: "Successfully pushed" });
        } catch (error) {
          console.error(error);
          throw error;
        }
      }
    })();
  } catch (error) {
    next(error);
  }
}

module.exports = { sendNotification };
