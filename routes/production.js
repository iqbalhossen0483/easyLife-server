const express = require("express");
const { postProduction, getProduction } = require("../services/production");

const productionRoute = express.Router();

productionRoute.post("/", postProduction);
productionRoute.get("/", getProduction);

module.exports = productionRoute;
