const express = require("express");
const {
  postProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} = require("../controller/products.controller");
const multer = require("../middleware/multer");
const productRouter = express.Router();

productRouter
  .route("/")
  .post(multer.single("profile"), postProduct)
  .get(getProducts)
  .put(multer.single("profile"), updateProduct)
  .delete(deleteProduct);

module.exports = productRouter;
