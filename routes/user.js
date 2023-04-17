const express = require("express");
const { getUser, postUser } = require("../services/user");

const userRouter = express.Router();

userRouter.route("/").get(getUser).post(postUser);

module.exports = userRouter;
