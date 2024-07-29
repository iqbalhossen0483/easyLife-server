const express = require("express");
const { queryDocument, postDocument } = require("../mysql");
const {
  updateStockReport,
  updateCashReport,
  insertCashReport,
} = require("../services/order");
const multer = require("../middleWares/multer");
const purchaseRouter = express.Router();

purchaseRouter.post("/", multer.array("files"), async (req, res, next) => {
  try {
    const { supplierId, giveAmount, userId, payment_info } = req.body;
    const totalPurchased = req.body.totalSale;
    const product = JSON.parse(req.body.products);
    const debtAmount = totalPurchased - giveAmount;

    //insert or update product purchase information;
    const purchaseSql = `INSERT INTO ${req.query.db}.purchased SET `;
    let files = "";
    if (req.files.length) {
      req.files.forEach((file) => {
        if (files) files += "," + file.filename;
        else files += file.filename;
      });
    }
    const docs = {
      supplier_id: supplierId,
      total_amount: totalPurchased,
      payment: giveAmount,
      due: debtAmount,
      purchased_by: userId,
      payment_info,
      files,
    };

    const purchase = await postDocument(purchaseSql, docs);
    // till;

    //update supplier;
    const supplierSql = `UPDATE ${req.query.db}.supplier SET totalPurchased = totalPurchased + ${totalPurchased}, giveAmount = giveAmount + ${giveAmount}, debtAmount= debtAmount + ${debtAmount} WHERE id = '${supplierId}'`;
    await queryDocument(supplierSql);

    //update user profile;
    const userSql = `UPDATE ${req.query.db}.users SET haveMoney = haveMoney - ${giveAmount} WHERE id = '${userId}'`;
    await queryDocument(userSql);

    //insert a transition history;
    if (parseInt(giveAmount || 0) > 0) {
      const transsitionSql = `INSERT INTO ${req.query.db}.transaction SET `;
      const transitionData = {
        fromUser: userId,
        toUser: supplierId,
        purpose: "Purchase Product",
        amount: giveAmount,
      };
      await postDocument(transsitionSql, transitionData);
    }

    const date = new Date();

    //update product information;
    for (item of product) {
      const { productId, price, total, qty } = item;

      //update product stock;
      const productSql = `UPDATE ${req.query.db}.products SET stock = stock + ${qty}, purchased= purchased + ${qty} WHERE id = '${productId}'`;
      await queryDocument(productSql);

      //add product to purchase list;
      const productsql = `INSERT INTO ${req.query.db}.purchased_product SET `;
      const productsDocs = {
        product_id: productId,
        purchase_id: purchase.insertId,
        qty,
        price,
        total,
      };
      await postDocument(productsql, productsDocs);

      //update product report;
      //update daily stock report;
      await updateStockReport(
        req,
        "daily_stock_report",
        item,
        date,
        "daily",
        true
      );

      //update monthly stock report;
      await updateStockReport(
        req,
        "monthly_stock_report",
        item,
        date,
        "month",
        true
      );

      //update yearly stock report;
      await updateStockReport(
        req,
        "yearly_stock_report",
        item,
        date,
        "year",
        true
      );
    }

    //update cash reports;
    if (giveAmount) {
      //update daily cash report;
      const data = { purchased: giveAmount };
      await updateCashReport(
        req,
        "daily_cash_report",
        data,
        date,
        "date",
        true
      );

      //update monthly cash report;
      await updateCashReport(
        req,
        "monthly_cash_report",
        data,
        date,
        "month",
        true
      );

      //update yearly cash report;
      await updateCashReport(
        req,
        "yearly_cash_report",
        data,
        date,
        "year",
        true
      );
    }

    res.send({ message: "Product purchase successfully added" });
  } catch (error) {
    next(error);
  }
});

purchaseRouter.get("/", async (req, res, next) => {
  try {
    if (req.query.id) {
      const sql = `SELECT purchased.*, s.name, s.address FROM ${req.query.db}.purchased INNER JOIN ${req.query.db}.supplier s ON s.id = purchased.supplier_id WHERE purchased.id = '${req.query.id}'`;
      const purchased = await queryDocument(sql);
      const productsql = `SELECT pp.*, p.shortName as name, p.name as full_name FROM ${req.query.db}.purchased_product pp INNER JOIN ${req.query.db}.products p ON pp.product_id = p.id WHERE pp.purchase_id = '${purchased[0].id}'`;
      const products = await queryDocument(productsql);
      purchased[0].products = products;

      const collectionsql = `SELECT pc.*, users.name FROM ${req.query.db}.purchased_collection pc INNER JOIN ${req.query.db}.users ON users.id = pc.senderId WHERE pc.orderId = '${purchased[0].id}'`;
      const collection = await queryDocument(collectionsql);
      purchased[0].collections = collection;
      res.send(purchased[0]);
    } else {
      const sql = `SELECT * FROM ${req.query.db}.purchased`;
      const result = await queryDocument(sql);
      res.send(result);
    }
  } catch (error) {
    next(error);
  }
});

purchaseRouter.put(
  "/collection",
  multer.array("files"),
  async (req, res, next) => {
    try {
      const { payment, due, discount, supplierId, sent_by, payment_info } =
        req.body;
      const collection = JSON.parse(req.body.collection);

      let files = "";
      if (req.body.files) {
        files = req.body.files;
      }
      if (req.files.length) {
        req.files.forEach((file) => {
          if (files) files += "," + file.filename;
          else files += file.filename;
        });
      }

      //update order info;
      const sql = `UPDATE ${req.query.db}.purchased SET payment=payment + ${payment}, due=${due},discount=${discount}, files = '${files}', payment_info = '${payment_info}' WHERE id = '${req.query.id}'`;
      const result = await queryDocument(sql);
      if (!result.affectedRows)
        throw { message: "Unable to received collection" };

      //insert a collection list;
      const collectionSql = `INSERT INTO ${req.query.db}.purchased_collection SET `;
      await postDocument(collectionSql, collection);

      //update the suplier;
      const shopSql = `UPDATE ${req.query.db}.supplier SET giveAmount = giveAmount + ${payment},discount= discount + ${discount}, 	debtAmount= 	debtAmount - ${payment} - ${discount} WHERE id = '${supplierId}'`;
      await queryDocument(shopSql);

      //update collection info into the user profile;
      const deliverSql = `UPDATE ${req.query.db}.users SET haveMoney = haveMoney - ${payment} WHERE id = ${sent_by}`;
      await queryDocument(deliverSql);

      //update cash report ;
      const isExistTodaySql = `SELECT id FROM ${req.query.db}.daily_cash_report WHERE DATE(date) = CURDATE()`;
      const isExistToday = await queryDocument(isExistTodaySql);

      if (isExistToday.length) {
        let updateReportSql = `UPDATE ${req.query.db}.daily_cash_report SET closing = closing - ${payment}, purchase = purchase + ${payment} WHERE id = '${isExistToday[0].id}'`;
        await queryDocument(updateReportSql);

        const date = new Date();
        const month = date.toLocaleString("en-us", { month: "long" });
        const year = date.getFullYear();
        const updatemonthlySql = `UPDATE ${req.query.db}.monthly_cash_report SET closing = closing + ${payment},  purchase = purchase + ${payment}  WHERE month = '${month}'`;
        await queryDocument(updatemonthlySql);
        const updateyearlySql = `UPDATE ${req.query.db}.yearly_cash_report SET closing = closing + ${payment},  purchase = purchase + ${payment} WHERE year = '${year}'`;
        await queryDocument(updateyearlySql);
      } else {
        const date = new Date();
        await insertCashReport(
          req,
          "daily_cash_report",
          date,
          "date",
          payment,
          discount
        );
        await insertCashReport(
          req,
          "monthly_cash_report",
          date,
          "month",
          payment,
          discount
        );
        await insertCashReport(
          req,
          "yearly_cash_report",
          date,
          "year",
          payment,
          discount
        );
      }

      res.send({ message: "Collection send successfully" });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = purchaseRouter;
