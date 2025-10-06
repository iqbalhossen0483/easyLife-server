const express = require("express");
const cors = require("cors");
const userRouter = require("./routes/user");
const deshboardRouter = require("./routes/admin");
const loginRoute = require("./routes/login");
const customerRoute = require("./routes/customers");
const notesRouter = require("./routes/notes");
const productRouter = require("./routes/products");
const supplierRouter = require("./routes/supplier");
const purchaseRouter = require("./routes/purchase");
const orderRouter = require("./routes/order");
const productionRoute = require("./routes/production");
const adminRouter = require("./routes/admin");
const expenseRouter = require("./routes/expense");
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
app.use("/", deshboardRouter);
app.use("/user", userRouter);
app.use("/login", loginRoute);
app.use("/customer", customerRoute);
app.use("/notes", notesRouter);
app.use("/product", productRouter);
app.use("/supplier", supplierRouter);
app.use("/purchase", purchaseRouter);
app.use("/order", orderRouter);
app.use("/admin", adminRouter);
app.use("/expense", expenseRouter);
app.use("/production", productionRoute);

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
