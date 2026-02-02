const express = require("express");
const {
  postSuppier,
  getSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controller/supplier.controller");
const multer = require("../middleware/multer");

const supplierRouter = express.Router();

supplierRouter
  .route("/")
  .post(multer.single("profile"), postSuppier)
  .get(getSupplier)
  .put(multer.single("profile"), updateSupplier)
  .delete(deleteSupplier);

module.exports = supplierRouter;
