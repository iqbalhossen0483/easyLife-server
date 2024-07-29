const { postDocument, queryDocument } = require("../mysql");
let database;

async function postOrder(req, res, next) {
  try {
    database = req.query.db;
    const products = req.body.products || [];
    delete req.body.products;
    const sql = `INSERT INTO ${database}.orders SET `;
    const { insertId } = await postDocument(sql, req.body);
    if (!insertId) throw { message: "Opps! unable to add" };

    for (const product of products) {
      delete product.name;
      product.orderId = insertId;
      const sql = `INSERT INTO ${database}.orders_products SET `;
      await postDocument(sql, product);
    }
    res.send({ message: "Added successfully" });
  } catch (error) {
    next(error);
  }
}

async function getOrders(req, res, next) {
  try {
    database = req.query.db;
    let sql = `SELECT o.*, c.shopName, c.profile, c.address,c.phone,c.commission FROM ${database}.orders o INNER JOIN ${database}.customers c ON c.id = o.shopId `;
    const page = parseInt(req.query.page || 0);

    //get single order;
    if (req.query.id) {
      sql += ` WHERE o.id = '${req.query.id}'`;
      const orders = await queryDocument(sql);
      if (!orders.length) {
        throw { message: "no data found", status: 404 };
      }
      if (!req.query.no_product) {
        let productSql = `SELECT op.*,p.shortName as name FROM ${database}.orders_products op INNER JOIN ${database}.products p ON op.productId = p.id WHERE op.orderId = '${req.query.id}'`;
        const products = await queryDocument(productSql);
        orders[0].products = products;
        const collectionSql = `SELECT c.*,u.name FROM ${database}.collections c INNER JOIN ${database}.users u ON c.receiverId = u.id WHERE orderId = '${req.query.id}' ORDER BY date DESC`;
        const collections = await queryDocument(collectionSql);
        orders[0].collections = collections;
      }
      res.send(orders[0]);
    }

    //notification;
    else if (req.query.notification) {
      let sql = `SELECT o.*, c.shopName, c.profile, c.address,c.phone,c.commission, u.name as created_by FROM ${database}.orders o INNER JOIN ${database}.customers c ON c.id = o.shopId INNER JOIN ${database}.users u ON u.id = o.created_by `;
      sql += ` WHERE status='undelivered' ORDER BY o.date DESC`;

      const orders = await queryDocument(sql);
      for (let i = 0; i < orders.length; i++) {
        let productSql = `SELECT op.*,p.name FROM ${database}.orders_products op INNER JOIN ${database}.products p ON p.id = op.productId WHERE op.orderId = '${orders[i].id}'`;
        const products = await queryDocument(productSql);
        orders[i].products = products;
      }

      res.send(orders);
    }

    //filtering;
    else if (req.query.from && req.query.end) {
      let sql = `SELECT o.*, c.shopName, c.profile, c.address,c.phone,c.commission, users.name FROM ${database}.orders o INNER JOIN ${database}.customers c ON c.id = o.shopId INNER JOIN ${database}.users ON users.id = o.delivered_by `;
      const fromdate = new Date(req.query.from);
      const enddate = new Date(req.query.end);
      const search = req.query.search?.trim();
      const condition = ` WHERE status='delivered' AND o.date >= '${fromdate
        .toISOString()
        .slice(0, 10)}' AND o.date <= '${enddate.toISOString().slice(0, 10)}' ${
        search
          ? ` AND (c.shopName LIKE '%${search}%' OR users.name  LIKE '%${search}%')`
          : ""
      } ORDER BY o.date DESC`;
      sql += condition;
      sql += ` LIMIT ${page * 50}, 50`;
      const orders = await queryDocument(sql);

      let allOrderSql = `SELECT o.id FROM ${database}.orders o INNER JOIN ${database}.customers c ON c.id = o.shopId INNER JOIN ${database}.users ON users.id = o.delivered_by`;
      allOrderSql += condition;
      const allOrders = await queryDocument(allOrderSql);

      res.send({ count: allOrders.length, data: orders });
    }
    //send all orders;
    else {
      const search = req.query.search?.trim();
      const searchsql = `c.shopName LIKE '%${search}%' OR c.address  LIKE '%${search}%' OR users.name  LIKE '%${search}%'`;
      const allSql = `SELECT o.id FROM ${database}.orders o INNER JOIN ${
        req.query.db
      }.customers c ON c.id = o.shopId INNER JOIN ${
        req.query.db
      }.users ON users.id = o.delivered_by ${
        req.query.user_id
          ? ` WHERE o.delivered_by = '${req.query.user_id}'`
          : ""
      } ${
        req.query.search
          ? `${req.query.user_id ? " AND " : " WHERE "} ${searchsql}`
          : ""
      }`;
      const allOrders = await queryDocument(allSql);

      //searching
      if (req.query.search) {
        let sql = `SELECT o.*, c.shopName, c.profile, c.address,c.phone,c.commission, users.name FROM ${database}.orders o INNER JOIN ${database}.customers c ON c.id = o.shopId INNER JOIN ${database}.users ON users.id = o.delivered_by `;
        sql += ` WHERE status='delivered' AND ${searchsql}  ORDER BY date DESC LIMIT ${
          page * 50
        }, 50`;
        if (req.query.end) {
          const fromdate = new Date(req.query.from);
          const enddate = new Date(req.query.end);
          sql += `AND o.date >= '${fromdate
            .toISOString()
            .slice(0, 10)}' AND o.date <= '${enddate
            .toISOString()
            .slice(0, 10)}'`;
        }

        const orders = await queryDocument(sql);
        res.send({ count: allOrders.length, data: orders });
      }

      // send all order;
      else {
        let sql = `SELECT o.*, c.shopName, c.profile, c.address,c.phone,c.commission, users.name FROM ${database}.orders o INNER JOIN ${database}.customers c ON c.id = o.shopId`;
        sql += ` INNER JOIN ${
          req.query.db
        }.users ON users.id = o.delivered_by WHERE status='delivered' ${
          req.query.user_id
            ? ` AND o.delivered_by = '${req.query.user_id}'`
            : ""
        } ORDER BY date DESC LIMIT ${page * 50}, 50`;
        const orders = await queryDocument(sql);
        res.send({ count: allOrders.length, data: orders });
      }
    }
  } catch (error) {
    next(error);
  }
}

async function updateOrder(req, res, next) {
  try {
    database = req.query.db;
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
    database = req.query.db;
    const sql = `DELETE FROM ${database}.orders WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Opps! unable to delete" };
    const productSql = `DELETE FROM ${database}.orders_products WHERE orderId = '${req.query.id}'`;
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
    const sql = `UPDATE ${database}.orders SET `;
    const condition = `WHERE id = '${req.query.id}'`;
    const result = await postDocument(sql, req.body, condition);
    if (!result.affectedRows) throw { message: "Opps! unable to update" };

    //insert products;
    for (const product of products) {
      if (product.id) continue;
      product.orderId = req.query.id;
      delete product.name;
      const sql = `INSERT INTO ${database}.orders_products SET `;
      await postDocument(sql, product);
    }

    //delete products;
    for (const id of deleteProduct) {
      if (id) {
        const sql = `DELETE FROM ${database}.orders_products WHERE id = '${id}'`;
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
    const prevSale = req.body.prevSale === "true" || false;
    req.body.date = dateformatter(new Date());
    delete req.body.shopId;
    delete req.body.forShop;
    delete req.body.prevSale;
    req.body.status = "delivered";
    const getproductSql = `SELECT op.productId,op.qty,op.total, p.stock FROM ${database}.orders_products op INNER JOIN ${database}.products p ON p.id = op.productId WHERE op.orderId = '${req.query.id}'`;
    const products = await queryDocument(getproductSql);

    //update order info;
    const sql = `UPDATE ${database}.orders SET `;
    const condition = `WHERE id = '${req.query.id}'`;
    const result = await postDocument(sql, req.body, condition);
    if (!result.affectedRows) throw { message: "Unable to complete order" };

    //update customer info;
    const shopSql = `UPDATE ${
      req.query.db
    }.customers SET totalSale = totalSale + ${
      shopData.totalSale
    }, dueSale = dueSale + ${shopData.dueSale || 0}, due = due + ${
      shopData.dueSale
    }, lastOrder = '${dateformatter(new Date())}' WHERE id = '${shopId}'`;

    await queryDocument(shopSql);

    // add some important info;
    const date = new Date();
    req.body.totalSale = shopData.totalSale;

    //update daily cash report;
    await updateCashReport(
      req,
      "daily_cash_report",
      req.body,
      date,
      "date",
      prevSale
    );

    //update monthly cash report;
    await updateCashReport(
      req,
      "monthly_cash_report",
      req.body,
      date,
      "month",
      prevSale
    );

    //update yearly cash report;
    await updateCashReport(
      req,
      "yearly_cash_report",
      req.body,
      date,
      "year",
      prevSale
    );

    for (item of products) {
      //update product stock ;
      const productStockSql = `UPDATE ${database}.products SET stock = stock - ${item.qty}, sold = sold + ${item.qty} WHERE id = '${item.productId}'`;
      await queryDocument(productStockSql);

      //update daily stock report;
      await updateStockReport(req, "daily_stock_report", item, date, "daily");

      //update monthly stock report;
      await updateStockReport(req, "monthly_stock_report", item, date, "month");

      //update yearly stock report;
      await updateStockReport(req, "yearly_stock_report", item, date, "year");
    }

    //update deliver man info;
    const deliverSql = `UPDATE ${database}.users SET delivered_order = delivered_order + 1, haveMoney = haveMoney + ${req.body.payment}, total_sale = total_sale + ${shopData.totalSale}, due_sale = due_sale + ${shopData.dueSale} WHERE id = ${delivered_by}`;
    await queryDocument(deliverSql);

    //break if previous sale;
    if (prevSale) {
      return res.send({ message: "Order is completed" });
    }

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

    res.send({ message: "Order is completed" });
  } catch (error) {
    next(error);
  }
}

async function updateuserTarget(id, totalSale, shopCommission) {
  const targetsql = `SELECT * FROM ${database}.target_commision tc WHERE tc.status = 'running' AND tc.user_id = '${id}'`;
  const target = await queryDocument(targetsql);

  if (target.length) {
    const amunt = (totalSale * (shopCommission / 100)) / 2;
    const achieveAmnt = target[0].achiveAmnt + amunt;
    const sql = `UPDATE ${database}.target_commision SET achiveAmnt = achiveAmnt + ${amunt} WHERE id = '${target[0].id}'`;
    await queryDocument(sql);

    if (achieveAmnt >= target[0].targetedAmnt) {
      const sql = `UPDATE ${database}.target_commision SET `;
      const opt = ` WHERE id = '${target[0].id}'`;
      await postDocument(sql, { status: "achieved" }, opt);

      const acsql = `INSERT INTO ${database}.pending_commition SET `;
      const payload = {
        user_id: target[0].user_id,
        target_commission_id: target[0].id,
        commission: target[0].targetedAmnt * (target[0].commission / 100),
      };
      await postDocument(acsql, payload);
    }
  }
}

async function getCollection(req, res, next) {
  try {
    const { payment, due, discount, collection, shopId, collected_by } =
      req.body;

    //check have due;
    const haveDueSql = `SELECT id FROM ${database}.orders WHERE id = '${req.query.id}' AND orders.due < ${payment}`;
    const haveDue = await queryDocument(haveDueSql);
    if (haveDue.length) {
      throw { message: "Opps! Too much payment" };
    }

    //update order info;
    const sql = `UPDATE ${database}.orders SET payment=payment + ${payment}, due=${due},discount=${discount} WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows)
      throw { message: "Unable to received collection" };

    //insert a collection list;
    const collectionSql = `INSERT INTO ${database}.collections SET `;
    await postDocument(collectionSql, collection);

    //update the customer;
    const shopSql = `UPDATE ${database}.customers SET collection= collection + ${payment},discount= discount + ${discount}, due= due - ${payment} - ${discount} WHERE id = '${shopId}'`;
    await queryDocument(shopSql);

    //update collection info into the user profile;
    const deliverSql = `UPDATE ${database}.users SET haveMoney = haveMoney + ${payment}, due_collection = due_collection + ${payment} WHERE id = ${collected_by}`;
    await queryDocument(deliverSql);

    //update cash report ;
    const isExistTodaySql = `SELECT id FROM ${database}.daily_cash_report WHERE DATE(date) = CURDATE()`;
    const isExistToday = await queryDocument(isExistTodaySql);

    if (isExistToday.length) {
      let updateReportSql = `UPDATE ${database}.daily_cash_report SET collection = collection + ${payment}, closing = closing + ${payment},marketDue = marketDue - ${payment} - ${discount}, expense = expense + ${discount} WHERE id = '${isExistToday[0].id}'`;
      await queryDocument(updateReportSql);

      const date = new Date();
      const month = date.toLocaleString("en-us", { month: "long" });
      const year = date.getFullYear();
      const updatemonthlySql = `UPDATE ${database}.monthly_cash_report SET collection = collection + ${payment},closing = closing + ${payment}, marketDue = marketDue - ${payment} - ${discount},expense = expense + ${discount} WHERE month = '${month}'`;
      await queryDocument(updatemonthlySql);
      const updateyearlySql = `UPDATE ${database}.yearly_cash_report SET collection = collection + ${payment}, closing = closing + ${payment}, marketDue = marketDue - ${payment} - ${discount},expense = expense + ${discount} WHERE year = '${year}'`;
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

    if (discount) {
      //insert or update expense information;
      const insertsql = `INSERT INTO ${database}.expense_info SET `;
      await postDocument(insertsql, {
        type: "Discount",
        amount: discount,
        created_by: collected_by,
      });
    }

    res.send({ message: "Collection received successfully" });
  } catch (error) {
    next(error);
  }
}

async function updateStockReport(
  req,
  row,
  item,
  date,
  dataCol,
  purchase = false
) {
  database = req.query.db;

  let isExiststockSql = `SELECT id FROM ${database}.${row} WHERE productId = '${item.productId}' AND `;
  if (row === "monthly_stock_report") {
    const month = date.toLocaleString("en-us", { month: "long" });
    isExiststockSql += `month = '${month}' AND year = '${date.getFullYear()}'`;
  } else if (row === "yearly_stock_report") {
    const year = date.getFullYear();
    isExiststockSql += `year = '${year}'`;
  } else isExiststockSql += "DATE(`date`) = CURDATE()";

  const isExist = await queryDocument(isExiststockSql);

  if (isExist.length) {
    let updateReportSql = `UPDATE ${database}.${row} SET totalSold = totalSold + ${item.qty}, remainingStock = remainingStock - ${item.qty} WHERE id = '${isExist[0].id}'`;
    if (purchase) {
      updateReportSql = `UPDATE ${database}.${row} SET purchased = purchased + ${item.qty}, remainingStock = remainingStock + ${item.qty} WHERE id = '${isExist[0].id}'`;
    }
    await queryDocument(updateReportSql);
    return;
  }

  const data = {
    productId: item.productId,
    previousStock: item.stock || 0,
    totalSold: item.qty || 0,
    purchased: item.purchased || 0,
    remainingStock: purchase ? item.stock + item.qty : item.stock - item.qty,
  };
  if (dataCol === "month") {
    data.month = date.toLocaleString("en-us", { month: "long" });
    data.year = new Date().getFullYear();
  } else if (dataCol === "year") {
    data.year = date.getFullYear();
  }

  const insertSql = `INSERT INTO ${database}.${row} SET `;
  await postDocument(insertSql, data);
}

async function updateCashReport(
  req,
  row,
  item,
  date,
  dataCol,
  purchase = false,
  expensed = false,
  prev = false
) {
  database = req.query.db;
  const { payment, due, discount, totalSale, purchased, expense } = item;

  let isExiststockSql = `SELECT id FROM ${database}.${row} `;
  if (row === "monthly_cash_report") {
    const month = date.toLocaleString("en-us", { month: "long" });
    isExiststockSql += `WHERE month = '${month}' AND year = '${date.getFullYear()}'`;
  } else if (row === "yearly_cash_report") {
    const year = date.getFullYear();
    isExiststockSql += `WHERE year = '${year}'`;
  } else isExiststockSql += "WHERE DATE(`date`) = CURDATE()";

  const isExist = await queryDocument(isExiststockSql);

  if (isExist.length) {
    let updateReportSql = `UPDATE ${database}.${row} SET ${
      prev ? "" : `totalSale = totalSale + ${totalSale},`
    } dueSale = dueSale + ${due}, expense= expense + ${discount}, marketDue = marketDue + ${due}, closing = closing + ${payment} WHERE id = '${
      isExist[0].id
    }'`;
    if (purchase)
      updateReportSql = `UPDATE ${database}.${row} SET purchase = purchase + ${purchased}, closing = closing - ${purchased} WHERE id = '${isExist[0].id}'`;
    else if (expensed)
      updateReportSql = `UPDATE ${database}.${row} SET expense = expense + ${expense}, closing = closing - ${expense} WHERE id = '${isExist[0].id}'`;
    await queryDocument(updateReportSql);
    return;
  }

  //insert the report;
  //get the previous report;
  const prevData = await getPrevData(row, date);

  const data = {
    opening: prevData[0]?.closing || 0,
    totalSale: prev ? 0 : totalSale || 0,
    dueSale: due || 0,
    expense: discount || 0,
    marketDue: prevData[0]?.marketDue || 0 + due,
    purchase: purchase || 0,
    expense: expense || 0,
    closing: payment || -purchased || -expense,
  };

  await insertABoilerFlat(dataCol, data, row, date);
}

async function getPrevData(row, date) {
  let prevSql = `SELECT closing,marketDue FROM ${database}.${row} `;
  if (row === "monthly_cash_report") {
    const prevMonth = getPreviousMonthName(date);
    prevSql += `WHERE month = '${prevMonth}'`;
  } else if (row === "yearly_cash_report") {
    const prevYear = date.getFullYear() - 1;
    prevSql += `WHERE year = '${prevYear}'`;
  } else {
    const prevDay = new Date(date.valueOf() - 1000 * 60 * 60 * 24);
    prevSql += `WHERE date = '${prevDay.toISOString()}'`;
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
  const insertSql = `INSERT INTO ${database}.${row} SET `;
  await postDocument(insertSql, data);
}

function getPreviousMonthName(date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1).toLocaleString(
    "en-us",
    { month: "long" }
  );
}

async function insertCashReport(req, row, date, col, payment, discount) {
  database = req.query.db;
  const prevData = await getPrevData(row, date);
  const data = {
    opening: prevData[0]?.closing || 0,
    collection: payment,
    closing: prevData[0]?.closing || 0 + payment,
    expense: discount,
    dueSale: prevData[0]?.dueSale - discount,
    marketDue: prevData[0]?.marketDue - payment - discount,
  };
  await insertABoilerFlat(col, data, row, date);
}

function dateformatter(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

module.exports = {
  postOrder,
  getOrders,
  updateOrder,
  removeOrder,
  updateCashReport,
  updateStockReport,
  insertCashReport,
};
