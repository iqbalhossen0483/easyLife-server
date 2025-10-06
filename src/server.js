const { sendNotification } = require("./controller/notification.controller");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;

//midleware;
app.use(cors());
app.use(morgan("dev"));
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
app.use("/", require("./routes/admin.route"));
app.use("/user", require("./routes/user.route"));
app.use("/login", require("./routes/login.route"));
app.use("/customer", require("./routes/customers.route"));
app.use("/notes", require("./routes/notes.route"));
app.use("/product", require("./routes/products.route"));
app.use("/supplier", require("./routes/supplier.route"));
app.use("/purchase", require("./routes/purchase.route"));
app.use("/order", require("./routes/order.route"));
app.use("/admin", require("./routes/admin.route"));
app.use("/expense", require("./routes/expense.route"));
app.use("/production", require("./routes/production.route"));
app.post("/message", sendNotification);

//error handler;
app.use((err, req, res, next) => {
  console.log(err);
  res
    .status(err.statusCode || 500)
    .send({ message: err.message || "Internal server error" });
});

//app listener;
app.listen(port, () => {
  console.log("its running", port);
});
