const express = require("express");
const multer = require("../middleware/multer");
const {
  postCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
} = require("../controller/customer.controller");
const customerRoute = express.Router();

customerRoute
  .route("/")
  .get(getCustomers)
  .post(multer.single("profile"), postCustomer)
  .put(multer.single("profile"), updateCustomer)
  .delete(deleteCustomer);

module.exports = customerRoute;
