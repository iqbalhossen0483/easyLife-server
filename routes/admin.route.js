const express = require("express");
const {
  getData,
  sendNotification,
  transations,
  getPendingCommission,
  achieveCommission,
  updateSiteinfo,
  deletePendingCommition,
  chartData,
  pichartData,
  productChartData,
} = require("../controller/deshboard.controller");
const adminRouter = express.Router();

adminRouter.get("/", getData);
adminRouter.get("/notification", sendNotification);
adminRouter.get("/transitions", transations);
adminRouter.get("/commission", getPendingCommission);
adminRouter.post("/commission", achieveCommission);
adminRouter.delete("/commission", deletePendingCommition);
adminRouter.put("/updateinfo", updateSiteinfo);
adminRouter.get("/chartdata", chartData);
adminRouter.get("/pichartdata", pichartData);
adminRouter.get("/productchartdata", productChartData);

module.exports = adminRouter;
