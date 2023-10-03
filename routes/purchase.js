const express = require("express");
const { queryDocument, postDocument } = require("../mysql");
const { updateStockReport, updateCashReport } = require("../services/order");
const purchaseRouter = express.Router();

purchaseRouter.post("/", async (req, res, next) => {
  try {
    const {
      supplierId,
      totalPurchased,
      giveAmount,
      debtAmount,
      product,
      userId,
    } = req.body;
    //update supplier;
    const supplierSql = `UPDATE supplier SET totalPurchased = totalPurchased + ${totalPurchased}, giveAmount = giveAmount + ${giveAmount}, debtAmount= debtAmount + ${debtAmount} WHERE id = '${supplierId}'`;
    await queryDocument(supplierSql);

    //update user profile;
    const userSql = `UPDATE users SET haveMoney = haveMoney - ${giveAmount} WHERE id = '${userId}'`;
    await queryDocument(userSql);

    //insert a transition history;
    const transsitionSql = "INSERT INTO transaction SET ";
    const transitionData = {
      fromUser: userId,
      toUser: supplierId,
      purpose: "Purchase Product",
      amount: giveAmount,
      date: new Date().toISOString(),
    };
    await postDocument(transsitionSql, transitionData);

    //update cash reports;
    //update daily cash report;
    const date = new Date();
    const data = { purchased: giveAmount };
    await updateCashReport("daily_cash_report", data, date, "date", true);

    //update monthly cash report;
    await updateCashReport("monthly_cash_report", data, date, "month", true);

    //update yearly cash report;
    await updateCashReport("yearly_cash_report", data, date, "year", true);

    //update product information;
    for (item of product) {
      const { productId, purchased } = item;
      //update product stock;
      const productSql = `UPDATE products SET stock = stock + ${purchased}, purchased= purchased + ${purchased} WHERE id = '${productId}'`;
      await queryDocument(productSql);

      //insert or update product purchase information;
      const existSql = `SELECT id FROM purchase_products WHERE supplierId = '${supplierId}' AND productId = '${productId}'`;
      const existed = await queryDocument(existSql);
      if (existed.length) {
        const sql = `UPDATE purchase_products SET purchased = purchased + ${item.purchased} WHERE id = '${existed[0].id}'`;
        await queryDocument(sql);
      } else {
        const data = { productId, supplierId, purchased };
        const purchaseSql = "INSERT INTO purchase_products SET ";
        await postDocument(purchaseSql, data);
      } // till;

      //update product report;
      //update daily stock report;
      await updateStockReport("daily_stock_report", item, date, "daily", true);

      //update monthly stock report;
      await updateStockReport(
        "monthly_stock_report",
        item,
        date,
        "month",
        true
      );

      //update yearly stock report;
      await updateStockReport("yearly_stock_report", item, date, "year", true);
    }
    res.send({ message: "Product purchase successfully added" });
  } catch (error) {
    next(error);
  }
});

module.exports = purchaseRouter;
