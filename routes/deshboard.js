const express = require("express");
const { getData } = require("../services/deshboard");
const deshboardRouter = express.Router();

deshboardRouter.get("/", getData);

module.exports = deshboardRouter;
