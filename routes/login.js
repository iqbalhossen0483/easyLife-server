const express = require("express");
const { login, checkIsLogin } = require("../controllers/login");

const loginRoute = express.Router();

loginRoute.route("/").post(login).get(checkIsLogin);

module.exports = loginRoute;
