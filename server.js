const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
const app = express();
const { Expo } = require("expo-server-sdk");
const { queryDocument } = require("./mysql");
const port = process.env.PORT || 5000;
app.use(morgan("dev"));

//midleware;
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use((req, res, next) => {
  if (/\.jpg|\.png|\.jpeg/.test(req.url)) {
    next();
  } else {
    const database = req.headers.database;
    if (!database) {
      console.log(req.url);
      next({ message: "Access denied", status: 401 });
    }
    req.query.db = database;
    next();
  }
});

//routes
app.use("/", require("./routes/admin"));
app.use("/user", require("./routes/user"));
app.use("/login", require("./routes/login"));
app.use("/customer", require("./routes/customers"));
app.use("/notes", require("./routes/notes"));
app.use("/product", require("./routes/products"));
app.use("/supplier", require("./routes/supplier"));
app.use("/purchase", require("./routes/purchase"));
app.use("/order", require("./routes/order"));
app.use("/admin", require("./routes/admin"));
app.use("/expense", require("./routes/expense"));
app.use("/production", require("./routes/production"));

app.post("/message", async (req, res, next) => {
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
});

//error handler;
app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.statusCode || 500).send({ message: "Internal server error" });
});

//app listener;
app.listen(port, () => {
  console.log("its running", port);
});
