const express = require("express");
const { login, checkIsLogin } = require("../controller/login.controller");

const loginRoute = express.Router();

loginRoute.route("/").post(login).get(checkIsLogin);

module.exports = loginRoute;
