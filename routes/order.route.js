const express = require("express");
const {
  postOrder,
  getOrders,
  updateOrder,
  removeOrder,
} = require("../controller/order.controller");

const orderRouter = express.Router();

orderRouter
  .route("/")
  .post(postOrder)
  .get(getOrders)
  .put(updateOrder)
  .delete(removeOrder);

module.exports = orderRouter;
