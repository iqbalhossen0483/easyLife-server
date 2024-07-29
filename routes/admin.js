const express = require("express");
const {
  getData,
  sendNotification,
  transations,
  getPendingCommission,
  achieveCommission,
  updateSiteinfo,
  deletePendingCommition,
} = require("../services/deshboard");
const adminRouter = express.Router();

adminRouter.get("/", getData);
adminRouter.get("/notification", sendNotification);
adminRouter.get("/transitions", transations);
adminRouter.get("/commission", getPendingCommission);
adminRouter.post("/commission", achieveCommission);
adminRouter.delete("/commission", deletePendingCommition);
adminRouter.put("/updateinfo", updateSiteinfo);

module.exports = adminRouter;
