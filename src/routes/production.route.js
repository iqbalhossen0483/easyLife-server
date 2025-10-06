const express = require("express");
const {
  postProduction,
  getProduction,
} = require("../controller/production.controller");

const productionRoute = express.Router();

productionRoute.post("/", postProduction);
productionRoute.get("/", getProduction);

module.exports = productionRoute;
