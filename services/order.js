const { postDocument, queryDocument } = require("../mysql");

async function postOrder(req, res, next) {
  try {
    const products = req.body.products || [];
    delete req.body.products;
    const sql = "INSERT INTO orders SET ";
    const { insertId } = await postDocument(sql, req.body);
    if (!insertId) throw { message: "Opps! unable to add" };

    for (const product of products) {
      delete product.name;
      product.orderId = insertId;
      const sql = "INSERT INTO orders_products SET ";
      await postDocument(sql, product);
    }
    res.send({ message: "Added successfully" });
  } catch (error) {
    next(error);
  }
}

async function getOrders(req, res, next) {
  try {
    let sql = `SELECT o.*, c.shopName, c.profile, c.address,c.phone,c.commission FROM orders o INNER JOIN customers c ON c.id = o.shopId`;

    //get single order;
    if (req.query.id) {
      sql += ` WHERE o.id = '${req.query.id}'`;
      const orders = await queryDocument(sql);
      if (!orders.length) {
        throw { message: "no data found", status: 404 };
      }
      if (!req.query.no_product) {
        let productSql = `SELECT op.*,p.name FROM orders_products op INNER JOIN products p ON op.productId = p.id WHERE op.orderId = '${req.query.id}'`;
        const products = await queryDocument(productSql);
        orders[0].products = products;
        const collectionSql = `SELECT c.*,u.name as receiver_name FROM collections c INNER JOIN users u ON c.receiverId = u.id WHERE orderId = '${req.query.id}' ORDER BY date DESC`;
        const collections = await queryDocument(collectionSql);
        orders[0].collections = collections;
      }
      res.send(orders[0]);
    }
    //get orders for notification page;
    else if (req.query.notification) {
      sql += " WHERE status='undelivered' ORDER BY o.date DESC";
      const orders = await queryDocument(sql);
      for (let i = 0; i < orders.length; i++) {
        let productSql = `SELECT op.*,p.name FROM orders_products op INNER JOIN products p ON p.id = op.productId WHERE op.orderId = '${orders[i].id}'`;
        const products = await queryDocument(productSql);
        orders[i].products = products;
      }
      res.send(orders);
    } else if (req.query.search || req.query.from || req.query.end) {
      sql += ` WHERE status='delivered' AND c.shopName LIKE '%${req.query.search.trim()}%' `;
      if (req.query.from) {
        const fromdate = new Date(req.query.from).toISOString();
        const enddate = new Date(req.query.end).toISOString();
        sql += `AND o.date >= '${fromdate}' AND o.date <= '${enddate}' `;
      }
      sql += "ORDER BY date DESC";
      const orders = await queryDocument(sql);
      res.send(orders);
    }
    //send all orders;
    else {
      const allSql = "SELECT id FROM orders";
      const page = parseInt(req.query.page || 0);
      const limit = (page + 1) * 51;
      sql += ` WHERE status='delivered' ORDER BY date DESC LIMIT ${
        page * 50
      }, ${limit - 1}`;
      const allOrders = await queryDocument(allSql);
      const orders = await queryDocument(sql);
      res.send({ count: allOrders.length, data: orders });
    }
  } catch (error) {
    next(error);
  }
}

async function updateOrder(req, res, next) {
  try {
    if (req.query.editOrder) {
      await editOrder(req, res, next); //done;
    } else if (req.query.collection) {
      getCollection(req, res, next); //done;
    } else {
      completeOrder(req, res, next); //done;
    }
  } catch (error) {
    next(error);
  }
}

async function removeOrder(req, res, next) {
  try {
    const sql = `DELETE FROM orders WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Opps! unable to delete" };
    const productSql = `DELETE FROM orders_products WHERE orderId = '${req.query.id}'`;
    await queryDocument(productSql);
    res.send({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

async function editOrder(req, res, next) {
  try {
    const products = req.body.products || [];
    const deleteProduct = req.body.deleteProduct || [];
    delete req.body.products;
    delete req.body.deleteProduct;
    const sql = "UPDATE orders SET ";
    const condition = `WHERE id = '${req.query.id}'`;
    const result = await postDocument(sql, req.body, condition);
    if (!result.affectedRows) throw { message: "Opps! unable to update" };

    //insert products;
    for (const product of products) {
      if (product.id) continue;
      product.orderId = req.query.id;
      delete product.name;
      const sql = "INSERT INTO orders_products SET ";
      await postDocument(sql, product);
    }

    //delete products;
    for (const id of deleteProduct) {
      if (id) {
        const sql = `DELETE FROM orders_products WHERE id = '${id}'`;
        await queryDocument(sql);
      }
    }
    res.send({ message: "update successfully" });
  } catch (error) {
    next(error);
  }
}

async function completeOrder(req, res, next) {
  try {
    const shopId = req.body.shopId;
    const shopData = req.body.forShop;
    const delivered_by = req.body.delivered_by;
    const prevSale = req.body.prevSale;
    delete req.body.shopId;
    delete req.body.forShop;
    delete req.body.prevSale;
    req.body.status = "delivered";
    const getproductSql = `SELECT op.productId,op.qty,op.total, p.stock FROM orders_products op INNER JOIN products p ON p.id = op.productId WHERE op.orderId = '${req.query.id}'`;
    const products = await queryDocument(getproductSql);

    //update order info;
    const sql = `UPDATE orders SET `;
    const condition = `WHERE id = '${req.query.id}'`;
    const result = await postDocument(sql, req.body, condition);
    if (!result.affectedRows) throw { message: "Unable to complete order" };

    //update customer info;
    const shopSql = `UPDATE customers SET `;
    const shopConditionSql = `WHERE id ='${shopId}'`;
    shopData.lastOrder = new Date().toISOString();
    await postDocument(shopSql, shopData, shopConditionSql);

    // add some important info;
    const date = new Date();
    req.body.totalSale = shopData.totalSale;

    //update daily cash report;
    await updateCashReport("daily_cash_report", req.body, date, "date");

    //update monthly cash report;
    await updateCashReport("monthly_cash_report", req.body, date, "month");

    //update yearly cash report;
    await updateCashReport("yearly_cash_report", req.body, date, "year");

    //break if previous sale;
    if (prevSale === "true") {
      return res.send({ message: "Order is completed" });
    }

    //update deliver man info;
    const deliverSql = `UPDATE users SET delivered_order = delivered_order + 1, haveMoney = haveMoney + ${req.body.payment}, total_sale = total_sale + ${shopData.totalSale}, due_sale = due_sale + ${shopData.dueSale} WHERE id = ${delivered_by}`;
    await queryDocument(deliverSql);
    //update targeted amount if exists;
    await updateuserTarget(
      delivered_by,
      shopData.totalSale,
      shopData.commission
    );
    await updateuserTarget(
      req.body.created_by,
      shopData.totalSale,
      shopData.commission
    );

    for (item of products) {
      //update product stock ;
      const productStockSql = `UPDATE products SET stock = stock - ${item.qty}, sold = sold + ${item.qty} WHERE id = '${item.productId}'`;
      await queryDocument(productStockSql);

      //update daily stock report;
      await updateStockReport("daily_stock_report", item, date, "daily");

      //update monthly stock report;
      await updateStockReport("monthly_stock_report", item, date, "month");

      //update yearly stock report;
      await updateStockReport("yearly_stock_report", item, date, "year");
    }

    res.send({ message: "Order is completed" });
  } catch (error) {
    next(error);
  }
}

async function updateuserTarget(id, totalSale, shopCommission) {
  const sqldelivary = `SELECT tc.id, tc.end_date, tc.user_id FROM target_commision tc WHERE tc.status = 'running' AND tc.user_id = '${id}'`;
  const targetDelivary = await queryDocument(sqldelivary);
  if (
    targetDelivary.length &&
    new Date().getTime() <= targetDelivary[0].end_date.getTime()
  ) {
    const sql = `UPDATE target_commision SET remainingAmount = remainingAmount - ${
      (totalSale * (shopCommission / 100)) / 2
    } WHERE id = '${targetDelivary[0].id}'`;
    await queryDocument(sql);
  }
}

async function getCollection(req, res, next) {
  try {
    const { payment, due, discount, collection, shopId, collected_by } =
      req.body;

    //update order info;
    const sql = `UPDATE orders SET payment=payment + ${payment}, due=${due},discount=${discount} WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows)
      throw { message: "Unable to received collection" };

    //insert a collection list;
    const collectionSql = "INSERT INTO collections SET ";
    await postDocument(collectionSql, collection);

    //update the customer;
    const shopSql = `UPDATE customers SET collection= collection + ${payment},discount= discount + ${discount}, due= due - ${payment} - ${discount} WHERE id = '${shopId}'`;
    await queryDocument(shopSql);

    //update collection info into the user profile;
    const deliverSql = `UPDATE users SET haveMoney = haveMoney + ${payment}, due_collection = due_collection + ${payment} WHERE id = ${collected_by}`;
    await queryDocument(deliverSql);

    //update cash report ;
    const isExistTodaySql = `SELECT id FROM daily_cash_report WHERE DATE(date) = CURDATE()`;
    const isExistToday = await queryDocument(isExistTodaySql);

    if (isExistToday.length) {
      let updateReportSql = `UPDATE daily_cash_report SET collection = collection + ${payment}, closing = closing + ${payment},marketDue = marketDue - ${payment} - ${discount}, expense = expense + ${discount}, dueSale = dueSale - ${discount} WHERE id = '${isExistToday[0].id}'`;
      await queryDocument(updateReportSql);

      const date = new Date();
      const month = date.toLocaleString("en-us", { month: "long" });
      const year = date.getFullYear();
      const updatemonthlySql = `UPDATE monthly_cash_report SET collection = collection + ${payment},closing = closing + ${payment}, marketDue = marketDue - ${payment} - ${discount},expense = expense + ${discount},dueSale = dueSale - ${discount} WHERE month = '${month}'`;
      await queryDocument(updatemonthlySql);
      const updateyearlySql = `UPDATE yearly_cash_report SET collection = collection + ${payment}, closing = closing + ${payment}, marketDue = marketDue - ${payment} - ${discount},expense = expense + ${discount},dueSale = dueSale - ${discount} WHERE year = '${year}'`;
      await queryDocument(updateyearlySql);
    } else {
      const date = new Date();
      await insertCashReport(
        "daily_cash_report",
        date,
        "date",
        payment,
        discount
      );
      await insertCashReport(
        "monthly_cash_report",
        date,
        "month",
        payment,
        discount
      );
      await insertCashReport(
        "yearly_cash_report",
        date,
        "year",
        payment,
        discount
      );
    }

    res.send({ message: "Collection received successfully" });
  } catch (error) {
    next(error);
  }
}

async function updateStockReport(row, item, date, dataCol, purchase = false) {
  let isExiststockSql = `SELECT id FROM ${row} WHERE productId = '${item.productId}' AND `;
  if (row === "monthly_stock_report") {
    const month = date.toLocaleString("en-us", { month: "long" });
    isExiststockSql += `month = '${month}' AND year = '${date.getFullYear()}'`;
  } else if (row === "yearly_stock_report") {
    const year = date.getFullYear();
    isExiststockSql += `year = '${year}'`;
  } else isExiststockSql += "DATE(`date`) = CURDATE()";

  const isExist = await queryDocument(isExiststockSql);

  if (isExist.length) {
    let updateReportSql = `UPDATE ${row} SET totalSold = totalSold + ${item.qty}, remainingStock = remainingStock - ${item.qty} WHERE id = '${isExist[0].id}'`;
    if (purchase)
      updateReportSql = `UPDATE ${row} SET purchased = purchased + ${item.purchased}, remainingStock = remainingStock - ${item.purchased} WHERE id = '${isExist[0].id}'`;
    await queryDocument(updateReportSql);
    return;
  }

  const data = {
    productId: item.productId,
    previousStock: item.stock || 0,
    totalSold: item.qty || 0,
    purchased: item.purchased || 0,
    remainingStock: item.stock - item.qty || item.purchased,
  };
  if (dataCol === "month") {
    data.month = date.toLocaleString("en-us", { month: "long" });
    data.year = new Date().getFullYear();
  } else if (dataCol === "year") {
    data.year = date.getFullYear();
  }

  const insertSql = `INSERT INTO ${row} SET `;
  await postDocument(insertSql, data);
}

async function updateCashReport(
  row,
  item,
  date,
  dataCol,
  purchase = false,
  expensed = false
) {
  const { payment, due, discount, totalSale, purchased, expense } = item;

  let isExiststockSql = `SELECT id FROM ${row} `;
  if (row === "monthly_cash_report") {
    const month = date.toLocaleString("en-us", { month: "long" });
    isExiststockSql += `WHERE month = '${month}' AND year = '${date.getFullYear()}'`;
  } else if (row === "yearly_cash_report") {
    const year = date.getFullYear();
    isExiststockSql += `WHERE year = '${year}'`;
  } else isExiststockSql += "WHERE DATE(`date`) = CURDATE()";

  const isExist = await queryDocument(isExiststockSql);

  if (isExist.length) {
    let updateReportSql = `UPDATE ${row} SET totalSale = totalSale + ${totalSale}, dueSale = dueSale + ${due}, expense= expense + ${discount}, marketDue = marketDue + ${due}, closing = closing + ${payment} WHERE id = '${isExist[0].id}'`;
    if (purchase)
      updateReportSql = `UPDATE ${row} SET purchase = purchase + ${purchased}, closing = closing - ${purchased} WHERE id = '${isExist[0].id}'`;
    else if (expensed)
      updateReportSql = `UPDATE ${row} SET expense = expense + ${expense}, closing = closing - ${expense} WHERE id = '${isExist[0].id}'`;
    await queryDocument(updateReportSql);
    return;
  }

  //insert the report;
  //get the previous report;
  const prevData = await getPrevData(row, date);

  const data = {
    opening: prevData[0]?.closing || 0,
    totalSale: totalSale || 0,
    dueSale: due || 0,
    expense: discount || 0,
    marketDue: due || 0,
    purchase: purchase || 0,
    expense: expense || 0,
    closing: payment || -purchased || -expense,
  };

  await insertABoilerFlat(dataCol, data, row, date);
}

async function getPrevData(row, date) {
  let prevSql = `SELECT closing FROM ${row} `;
  if (row === "monthly_cash_report") {
    const prevMonth = getPreviousMonthName(date);
    prevSql += `WHERE month = '${prevMonth}'`;
  } else if (row === "yearly_cash_report") {
    const prevYear = date.getFullYear() - 1;
    prevSql += `WHERE year = '${prevYear}'`;
  } else {
    const prevDay = new Date(date.valueOf() - 1000 * 60 * 60 * 24);
    prevSql += `WHERE date = '${prevDay}'`;
  }
  const prevData = await queryDocument(prevSql);
  return prevData;
}

async function insertABoilerFlat(dataCol, data, row, date) {
  if (dataCol === "month") {
    data.month = date.toLocaleString("en-us", { month: "long" });
    data.year = date.getFullYear();
  } else if (dataCol === "year") {
    data.year = date.getFullYear();
  }
  const insertSql = `INSERT INTO ${row} SET `;
  await postDocument(insertSql, data);
}

function getPreviousMonthName(date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1).toLocaleString(
    "en-us",
    { month: "long" }
  );
}

async function insertCashReport(row, date, col, payment, discount) {
  const prevData = await getPrevData(row, date);
  const data = {
    opening: prevData[0]?.closing || 0,
    collection: payment,
    closing: payment,
    expense: discount,
    dueSale: prevData[0]?.dueSale - discount,
    marketDue: prevData[0]?.marketDue - payment - discount,
  };
  await insertABoilerFlat(col, data, row, date);
}

module.exports = {
  postOrder,
  getOrders,
  updateOrder,
  removeOrder,
  updateCashReport,
  updateStockReport,
};
