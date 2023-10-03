const express = require("express");
const {
  getUser,
  postUser,
  deleteUser,
  putUser,
  addATargetForUser,
  updateTarget,
  balance_transfer,
  receive_balance,
} = require("../services/user");
const multer = require("../middleWares/multer");

const userRouter = express.Router();

userRouter
  .route("/")
  .get(getUser)
  .post(postUser)
  .delete(deleteUser)
  .put(multer.single("profile"), putUser);

userRouter.post("/target", addATargetForUser);
userRouter.put("/target", updateTarget);
userRouter.post("/balance_transfer", balance_transfer);
userRouter.post("/receive_balance", receive_balance);

module.exports = userRouter;
