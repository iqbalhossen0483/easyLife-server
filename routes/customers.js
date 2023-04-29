const express = require("express");
const multer = require("../middleWares/multer");
const {
  postCustomer,
  getCustomers,
  deleteCustomer,
  updateCustomer,
} = require("../services/customers");
const customerRoute = express.Router();

customerRoute
  .route("/")
  .get(getCustomers)
  .post(multer.single("profile"), postCustomer)
  .delete(deleteCustomer)
  .put(multer.single("profile"), updateCustomer);

module.exports = customerRoute;
