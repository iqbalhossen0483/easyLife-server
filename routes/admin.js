const express = require("express");
const {
  getData,
  sendNotification,
  transations,
  getPendingCommission,
  achieveCommission,
} = require("../services/deshboard");
const adminRouter = express.Router();

adminRouter.get("/", getData);
adminRouter.get("/notification", sendNotification);
adminRouter.get("/transitions", transations);
adminRouter.get("/commission", getPendingCommission);
adminRouter.post("/commission", achieveCommission);

module.exports = adminRouter;
