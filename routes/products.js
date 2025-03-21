const express = require("express");
const {
  postProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} = require("../controllers/products");
const multer = require("../middleWares/multer");
const productRouter = express.Router();

productRouter
  .route("/")
  .post(multer.single("profile"), postProduct)
  .get(getProducts)
  .put(multer.single("profile"), updateProduct)
  .delete(deleteProduct);

module.exports = productRouter;
