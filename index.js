const express = require("express");
const cors = require("cors");
const userRouter = require("./routes/user");
const deshboardRouter = require("./routes/deshboard");
const loginRoute = require("./routes/login");
const customerRoute = require("./routes/customers");
const notesRouter = require("./routes/notes");
const productRouter = require("./routes/products");
const supplierRouter = require("./routes/supplier");
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
app.use("/supplier", supplierRouter);

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
