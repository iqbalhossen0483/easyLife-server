const express = require("express");
const cors = require("cors");
const userRouter = require("./routes/user");
const deshboardRouter = require("./routes/deshboard");
const loginRoute = require("./routes/login");
const customerRoute = require("./routes/customers");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//midleware;
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

//routes
app.use("/", deshboardRouter);
app.use("/user", userRouter);
app.use("/login", loginRoute);
app.use("/customer", customerRoute);

//error handler;
app.use((err, req, res, next) => {
  console.log(err);
  res
    .status(err.statusCode || 500)
    .send({ message: err.message || err.error || "Internal error" });
});

//app listener;
app.listen(port, () => {
  console.log("its running", port);
});
