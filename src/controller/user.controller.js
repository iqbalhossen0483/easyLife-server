const { postDocument, queryDocument } = require("../services/mysql.service");
const { deleteImage } = require("../services/common.service");
const { addReport } = require("./expense.controller");
const statusCode = require("../config/statusCode");

async function getUser(req, res, next) {
  try {
    let sql = `SELECT * FROM ${req.query.db}.users `;
    if (req.query.id) {
      sql = `SELECT * FROM ${req.query.db}.users  WHERE id = '${req.query.id}'`;
    }
    if (req.query.type) {
      sql = `SELECT id, name, 'user' as type FROM ${req.query.db}.users `;
    }
    const result = await queryDocument(sql);
    if (!req.query.type) {
      let i = 0;
      for (const user of result) {
        const sql = `SELECT * FROM ${req.query.db}.target_commision WHERE user_id = ${user.id}`;
        const tc = await queryDocument(sql);
        result[i].targets = tc;
        i++;
      }
    }
    if (req.query.id && result.length) {
      result[0].money_transactions = {};
      //send commission data pending;
      const sql = `SELECT ac.*, users.name, tc.targetedAmnt FROM ${req.query.db}.pending_commition ac INNER JOIN ${req.query.db}.target_commision tc ON ac.target_commission_id = tc.id INNER JOIN ${req.query.db}.users ON ac.user_id = users.id WHERE ac.user_id = '${req.query.id}'`;
      const commision = await queryDocument(sql);

      result[0].money_transactions.commision = commision[0] || null;

      //send transaction pending data;
      const transactionSql = `SELECT pt.id, pt.*, tu.name as toUsername, fu.name as fromUsername FROM ${req.query.db}.pending_balance_transfer pt LEFT JOIN ${req.query.db}.users tu ON pt.toUser = tu.id LEFT JOIN ${req.query.db}.users fu ON pt.fromUser = fu.id WHERE pt.fromUser = '${result[0].id}' OR pt.toUser = '${result[0].id}'`;
      const transaction = await queryDocument(transactionSql);

      result[0].money_transactions.transactions = transaction;
    }

    res.send(result);
  } catch (error) {
    next(error);
  }
}

async function postUser(req, res, next) {
  try {
    //check is exist;
    const existQuery = `SELECT id FROM ${req.query.db}.users WHERE phone = '${req.body.phone}'`;
    const exist = await queryDocument(existQuery);
    if (exist.length) throw { message: "User already exist" };

    //else procced;
    const query = `INSERT INTO ${req.query.db}.users SET `;
    const result = await postDocument(query, req.body);
    if (result.insertId) res.send({ message: "User addedd successfully" });
    else throw { message: "Opps!, unable to add" };
  } catch (error) {
    next(error);
  }
}

async function putUser(req, res, next) {
  try {
    const existedImg = req.body.existedImg;
    delete req.body.existedImg;
    if (req.file) req.body.profile = req.file.filename;
    const query = `UPDATE ${req.query.db}.users SET `;
    const condition = ` WHERE id='${req.body.id}'`;
    delete req.body.id;
    const result = await postDocument(query, req.body, condition);
    if (existedImg) deleteImage(existedImg);
    if (!req.query.token) {
      if (!result.changedRows) throw { message: "Opps! Unable to update" };
    }
    res.send({ message: "Updated successfully" });
  } catch (error) {
    if (req.file) deleteImage(req.file.filename);
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const sql = `DELETE FROM ${req.query.db}.users WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Opps! Unable to delete" };
    if (req.query.profile) deleteImage(req.query.profile);
    res.send({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

async function addATargetForUser(req, res, next) {
  try {
    const data = req.body;

    let endDate = new Date(data.end_date);
    endDate.setUTCHours(23, 59, 59);
    const sql = `INSERT INTO ${req.query.db}.target_commision SET `;
    data.end_date = JSON.parse(JSON.stringify(endDate));

    const target = await postDocument(sql, data);

    if (!target.insertId) {
      throw {
        message: "Could not insert, Try again.",
        status: statusCode.UNPROCESSABLE_ENTITY,
      };
    }
    res.send({
      message: "Target added successfully",
      status: statusCode.SUCCESS,
      success: true,
    });
  } catch (error) {
    next(error);
    console.log(error);
  }
}

async function balance_transfer(req, res, next) {
  try {
    if (req.body.user_type === "user") {
      delete req.body.user_type;
      const sql = `INSERT INTO ${req.query.db}.pending_balance_transfer SET `;
      const result = await postDocument(sql, req.body);
      if (!result.insertId) throw { message: "Couldn't addedd successfully" };
      res.send({ message: "Your transaction is in pending" });
    } else {
      delete req.body.user_type;
      receive_balance(req, res, next);
    }
  } catch (error) {
    next(error);
  }
}

async function receive_balance(req, res, next) {
  try {
    //from user sql;
    const fromUserchangedfeild =
      req.body.purpose === "Debt Payment"
        ? "debt = debt"
        : "haveMoney = haveMoney";
    let fromUsersql = `UPDATE ${req.query.db}.users SET ${fromUserchangedfeild} - ${req.body.amount} WHERE id = '${req.body.fromUser}'`;
    //till;

    //to user sql;
    const toUserChangeFeild =
      req.body.purpose === "Salary"
        ? "get_salary = get_salary"
        : req.body.purpose === "Incentive"
        ? "incentive = incentive"
        : req.body.purpose === "Purchase Product"
        ? "giveAmount = giveAmount"
        : req.body.purpose === "Debt"
        ? "debt = debt"
        : "haveMoney = haveMoney";
    const touserDbsql =
      req.body.purpose === "Purchase Product"
        ? `${req.query.db}.supplier`
        : `${req.query.db}.users`;
    let toUsersql = `UPDATE ${touserDbsql} SET ${toUserChangeFeild} + '${
      req.body.amount
    }' ${
      req.body.purpose === "Purchase Product"
        ? `,debtAmount = debtAmount - '${req.body.amount}'`
        : ""
    } WHERE id = '${req.body.toUser}'`;
    //till;

    const body = {
      fromUser: req.body.fromUser,
      toUser: req.body.toUser,
      purpose: req.body.purpose,
      amount: req.body.amount,
      notes: req.body.notes,
    };
    //insert transition history;
    const transactionSql = `INSERT INTO ${req.query.db}.transaction SET `;
    await queryDocument(fromUsersql);
    await queryDocument(toUsersql);
    await postDocument(transactionSql, body);

    //delete pending transactions;
    const deleteTransactionSql = `DELETE FROM ${req.query.db}.pending_balance_transfer WHERE id = '${req.body.id}'`;
    await queryDocument(deleteTransactionSql);

    if (/Incentive|Salary/.test(req.body.purpose)) {
      const data = {
        type: req.body.purpose,
        amount: req.body.amount,
        created_by: req.body.fromUser,
      };
      await addReport(req, data, res, next, false);

      // delete commission data to temporary table;
      if (req.body.commision) {
        const deleteSql = `DELETE FROM ${req.query.db}.pending_commition WHERE id = '${req.body.commision}'`;
        await queryDocument(deleteSql);
      }
      return;
    }
    res.send({ message: "Balance rechived successfully" });
  } catch (error) {
    next(error);
  }
}

async function decline_balance_transfer(req, res, next) {
  try {
    const sql = `DELETE FROM ${req.query.db}.pending_balance_transfer WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows)
      throw { message: "failed to delete pending balance transfer" };
    res.send({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

async function recentActivity(req, res, next) {
  try {
    let orderSql = `SELECT o.id, o.date, o.totalSale, o.payment, o.due, o.status, c.shopName, c.profile, c.address,c.phone, u.name FROM ${req.query.db}.orders o INNER JOIN ${req.query.db}.customers c ON c.id = o.shopId INNER JOIN ${req.query.db}.users u ON u.id = o.delivered_by WHERE o.delivered_by = '${req.query.user_id}'`;
    let collSql = `SELECT o.id, col.date as date, col.date as coll_date, col.amount as payment, o.date as order_date, o.totalSale, o.due, c.shopName, c.profile, c.address,c.phone, u.name, o.status FROM ${req.query.db}.collections col INNER JOIN ${req.query.db}.orders o ON o.id = col.orderId INNER JOIN ${req.query.db}.customers c ON c.id = o.shopId INNER JOIN ${req.query.db}.users u ON u.id = col.receiverId `;
    if (req.query.today) {
      orderSql += "AND CAST(o.date AS DATE) = CAST( curdate() AS DATE)";
      collSql += `WHERE col.receiverId = '${req.query.user_id}' AND CAST(col.date AS DATE) = CAST( curdate() AS DATE)`;

      const expensesql = `SELECT * FROM ${req.query.db}.pending_expense px WHERE px.created_by = '${req.query.user_id}' AND CAST(px.date AS DATE) = CAST( curdate() AS DATE)`;

      const expenseReq = await queryDocument(expensesql);
      const orders = await queryDocument(orderSql);
      const collections = await queryDocument(collSql);
      res.send({ orders, collections, expenseReq });
    } else if (req.query.coll) {
      const page = parseInt(req.query.page || 0);
      const search = req.query.search?.trim();
      const user = req.query.user_id;
      const fromdate = req.query.from && new Date(req.query.from);
      const enddate = req.query.end && new Date(req.query.end);

      collSql += ` ${search || user || enddate ? "WHERE " : ""} ${
        user ? `u.id = '${user}'` : ""
      } ${search && user ? " AND " : ""} ${
        search
          ? `(c.shopName LIKE '%${search}%' OR c.address LIKE '%${search}%' OR u.name LIKE '%${search}%')`
          : ""
      } ${(search || user) && enddate ? " AND " : ""} ${
        enddate
          ? `col.date >= '${fromdate
              ?.toISOString()
              ?.slice(0, 10)}' AND col.date <= '${enddate
              ?.toISOString()
              ?.slice(0, 10)}'`
          : ""
      } `;

      const allColl = await queryDocument(collSql);

      collSql += `ORDER BY coll_date DESC LIMIT ${page * 50}, 50`;
      const coll = await queryDocument(collSql);
      res.send({ count: allColl.length, data: coll });
    } else {
      next({ message: "No data found" });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUser,
  postUser,
  deleteUser,
  putUser,
  addATargetForUser,
  balance_transfer,
  receive_balance,
  decline_balance_transfer,
  recentActivity,
};
