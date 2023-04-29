const express = require("express");
const { getUser, postUser, deleteUser, putUser } = require("../services/user");
const multer = require("../middleWares/multer");

const userRouter = express.Router();

userRouter
  .route("/")
  .get(getUser)
  .post(postUser)
  .delete(deleteUser)
  .put(multer.single("profile"), putUser);

module.exports = userRouter;
