const express = require("express");
const cors = require("cors");
const userRouter = require("./routes/user");
const deshboardRouter = require("./routes/deshboard");
const app = express();
const port = process.env.PORT || 5000;

//midleware;
app.use(cors());
app.use(express.json());

//routes
app.use("/", deshboardRouter);
app.use("/user", userRouter);

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
