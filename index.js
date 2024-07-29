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
const adminRouter = require("./routes/admin");
const expenseRouter = require("./routes/expense");
const WebSocket = require("ws");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const productionRoute = require("./routes/production");

//midleware;
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use((req, res, next) => {
  const database = req.headers.database;
  console.log(req.url);
  if (!database) {
    next("Access Denied");
  }
  req.query.db = database;
  next();
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

//error handler;
app.use((err, req, res, next) => {
  console.log(err);
  res
    .status(err.statusCode || 500)
    .send({ message: err.message || "Internal error" });
});

//app listener;
const server = app.listen(port, () => {
  console.log("its running", port);
});

const wss = new WebSocket.Server({ server });

const clients = {};

wss.on("connection", (socket) => {
  socket.on("message", async (item) => {
    const data = JSON.parse(item.toString());
    if (data.type === "init") {
      clients[data.user] = socket;
      clients[data.user].designation = data.designation;
    } else if (data.type === "createdOrder") {
      Object.entries(clients).forEach(([id, client]) => {
        if (data.id !== id) {
          client.send(
            JSON.stringify({
              id: data.id,
              type: "receivedOrder",
              title: "Order Received",
              body: "An Order has been created by " + data.name,
            })
          );
        }
      });
    } else if (data.type === "completeOrder") {
      Object.entries(clients).forEach(([id, client]) => {
        if (data.id !== id) {
          client.send(
            JSON.stringify({
              id: data.id,
              type: "completeOderNotify",
              title: "Order completed",
              body: `The order of "${data.shopName}" is completed by ${data.name}`,
            })
          );
        }
      });
    } else if (data.type === "balance_transfer_request") {
      if (clients[data.to]) {
        clients[data.to].send(
          JSON.stringify({
            type: "balance_request_received",
            title: "A request for balance receiving",
            body: `You are requested to receiving this money ${data.formName}`,
          })
        );
      }
    } else if (data.type === "balance_accepted") {
      if (clients[data.fromUser]) {
        console.log("inside sending");
        clients[data.fromUser].send(
          JSON.stringify({
            type: "balance_accepted_notify",
            title: "Balance accepted",
            body: `Your balance request has been accepted by ${data.toUserName}`,
          })
        );
      }
    } else if (data.type === "balance_decline") {
      if (clients[data.fromUser]) {
        clients[data.fromUser].send(
          JSON.stringify({
            type: "balance_decline_notify",
            title: "Balance declined",
            body: `Your balance request has been declined by ${data.toUserName}`,
          })
        );
      }
    } else if (data.type === "target_received") {
      if (clients[data.to]) {
        clients[data.to].send(
          JSON.stringify({
            type: "target_received_notify",
            title: "Target received",
            body: `You received a target by ${data.by}`,
          })
        );
      }
    } else if (data.type === "expense_req_sent") {
      Object.entries(clients).forEach(([id, client]) => {
        if (client.designation === "Admin") {
          client.send(
            JSON.stringify({
              type: "expense_req_got",
              title: "Expense request received",
              body: "An expense request sent by " + data.name,
            })
          );
        }
      });
    } else if (data.type === "expense_req_accepted") {
      if (clients[data.to]) {
        clients[data.to].send(
          JSON.stringify({
            type: "expense_req_accepted_notify",
            title: "Expense Request Accepted",
            body: `You expense request accepted by ${data.by}`,
          })
        );
      }
    } else if (data.type === "shop_added") {
      Object.entries(clients).forEach(([id, client]) => {
        if (data.id !== id) {
          client.send(
            JSON.stringify({
              id: data.id,
              type: "added_custoemer_notify",
              title: "Customer added",
              body: "An customer added by " + data.name,
            })
          );
        }
      });
    } else if (data.type === "expense_req_decline") {
      if (clients[data.to]) {
        clients[data.to].send(
          JSON.stringify({
            type: "expense_req_decline_notify",
            title: "Expense Request Declined",
            body: `You expense request declined by ${data.by}`,
          })
        );
      }
    }
  });

  socket.on("error", (err) => {
    console.log(err);
  });
});

// Sets "wss" so Express routes can access the socket instance later - important!
app.set("wss", wss);
