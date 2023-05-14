const express = require("express");
const {
  postSuppier,
  getSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../services/supplier");
const multer = require("../middleWares/multer");

const supplierRouter = express.Router();

supplierRouter
  .route("/")
  .post(multer.single("profile"), postSuppier)
  .get(getSupplier)
  .put(multer.single("profile"), updateSupplier)
  .delete(deleteSupplier);

module.exports = supplierRouter;
