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
      try {
        const { productId, purchased } = item;
        const productSql = `UPDATE products SET stock = stock + ${purchased}, purchased= purchased + ${purchased} WHERE id = '${productId}'`;
        await queryDocument(productSql);
        item.supplierId = supplierId;
        const existSql = `SELECT id FROM purchase_products WHERE supplierId = '${supplierId}' AND product_name = '${item.product_name}'`;
        const existed = await queryDocument(existSql);
        if (existed) {
          const sql = `UPDATE purchase_products SET purchased = purchased + ${item.purchased} WHERE id = '${existed[0].id}'`;
          await queryDocument(sql);
        } else {
          const purchaseSql = "INSERT INTO purchase_products SET ";
          await postDocument(purchaseSql, item);
        }
      } catch (error) {
        throw error;
      }
    });
    res.send({ message: "Product purchase successfully added" });
  } catch (error) {
    next(error);
  }
});

module.exports = purchaseRouter;
