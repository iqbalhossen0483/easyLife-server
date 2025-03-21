const { pushNotification } = require("./controllers/pushNotification");
const { isAuthorizedUser } = require("./libs/isAuthorizedUser");
const productionRoute = require("./routes/production");
const purchaseRouter = require("./routes/purchase");
const customerRoute = require("./routes/customers");
const supplierRouter = require("./routes/supplier");
const productRouter = require("./routes/products");
const expenseRouter = require("./routes/expense");
const deshboardRouter = require("./routes/admin");
const notesRouter = require("./routes/notes");
const orderRouter = require("./routes/order");
const adminRouter = require("./routes/admin");
const loginRoute = require("./routes/login");
const userRouter = require("./routes/user");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

//midleware;
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(isAuthorizedUser);

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
app.post("/message", pushNotification);

//error handler;
app.use((err, req, res, next) => {
  console.log(err);
  res
    .status(err.statusCode || 500)
    .send({ message: err.message || "Internal error" });
});

//app listener;
app.listen(port, () => {
  console.log("its running", port);
});
