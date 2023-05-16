const express = require("express");
const { queryDocument, postDocument } = require("../mysql");
const purchaseRouter = express.Router();

purchaseRouter.post("/", async (req, res, next) => {
  try {
    const { supplierId, totalPurchased, giveAmount, debtAmount, product } =
      req.body;
    const supplierSql = `UPDATE supplier SET totalPurchased = totalPurchased + ${totalPurchased}, giveAmount = giveAmount + ${giveAmount}, debtAmount= debtAmount + ${debtAmount} WHERE id = '${supplierId}'`;
    await queryDocument(supplierSql);
    product.forEach(async (item) => {
      const { productId, purchased } = item;
      const productSql = `UPDATE products SET stock = stock + ${purchased}, purchased= purchased + ${purchased} WHERE id = '${productId}'`;
      await queryDocument(productSql);
      item.supplierId = supplierId;
      const purchaseSql = "INSERT INTO purchase_products SET ";
      await postDocument(purchaseSql, item);
    });
    res.send({ message: "Product purchase successfully added" });
  } catch (error) {
    next(error);
  }
});

module.exports = purchaseRouter;
