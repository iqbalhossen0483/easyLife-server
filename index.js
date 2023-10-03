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
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//midleware;
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

//routes
app.use("/", deshboardRouter);
app.use("/user", userRouter); //done
app.use("/login", loginRoute); //done
app.use("/customer", customerRoute); //done
app.use("/notes", notesRouter); //done
app.use("/product", productRouter); //done
app.use("/supplier", supplierRouter); //done
app.use("/purchase", purchaseRouter); //done
app.use("/order", orderRouter); //done
app.use("/admin", adminRouter);
app.use("/expense", expenseRouter);

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
