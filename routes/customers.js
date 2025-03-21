const express = require("express");
const multer = require("../middleWares/multer");
const {
  postCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customers");
const customerRoute = express.Router();

customerRoute
  .route("/")
  .get(getCustomers)
  .post(multer.single("profile"), postCustomer)
  .put(multer.single("profile"), updateCustomer)
  .delete(deleteCustomer);

module.exports = customerRoute;
