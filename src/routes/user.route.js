const express = require("express");
const {
  getUser,
  postUser,
  deleteUser,
  putUser,
  addATargetForUser,
  balance_transfer,
  receive_balance,
  decline_balance_transfer,
  recentActivity,
  userReport,
} = require("../controller/user.controller");
const multer = require("../middleware/multer");

const userRouter = express.Router();

userRouter
  .route("/")
  .get(getUser)
  .post(postUser)
  .delete(deleteUser)
  .put(multer.single("profile"), putUser);

userRouter.post("/target", addATargetForUser);
userRouter.post("/balance_transfer", balance_transfer);
userRouter.post("/receive_balance", receive_balance);
userRouter.delete("/decline_balance", decline_balance_transfer);
userRouter.get("/recentactivity", recentActivity);
userRouter.post("/user-report", userReport);

module.exports = userRouter;
