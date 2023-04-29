const express = require("express");
const { login, checkIsLogin } = require("../services/login");

const loginRoute = express.Router();

loginRoute.route("/").post(login).get(checkIsLogin);

module.exports = loginRoute;
