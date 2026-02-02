const express = require("express");
const { login, getProfile } = require("../controller/login.controller");

const loginRoute = express.Router();

loginRoute.route("/").post(login).get(getProfile);

module.exports = loginRoute;
