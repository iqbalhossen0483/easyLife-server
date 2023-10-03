const { postDocument, queryDocument } = require("../mysql");
const { deleteImage } = require("./common");

async function getUser(req, res, next) {
  try {
    let sql = "SELECT * FROM users ";
    if (req.query.id) {
      sql += `WHERE id = '${req.query.id}'`;
    }
    const result = await queryDocument(sql);
    let i = 0;
    for (const user of result) {
      const sql = `SELECT * FROM target_commision WHERE user_id = ${user.id}`;
      const tc = await queryDocument(sql);
      result[i].targets = tc;
      i++;
    }
    if (req.query.id && result.length) {
      result[0].money_transactions = {};
      //send commission data pending;
      const sql = `SELECT ac.id, ac.user_id, ac.commission, users.name, tc.targetedAmount FROM achieved_commition ac INNER JOIN target_commision tc ON ac.target_commission_id = tc.id INNER JOIN users ON ac.user_id = users.id WHERE ac.user_id = '${req.query.id}'`;
      const commision = await queryDocument(sql);

      result[0].money_transactions.commision = commision[0] || null;

      //send transaction pending data;
      const transactionSql = `SELECT pt.id, pt.*, tu.name as toUsername, fu.name as fromUsername FROM pending_balance_transfer pt LEFT JOIN users tu ON pt.toUser = tu.id LEFT JOIN users fu ON pt.fromUser = fu.id WHERE pt.fromUser = '${result[0].id}' OR pt.toUser = '${result[0].id}'`;
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
    const existQuery = `SELECT id FROM users WHERE phone = '${req.body.phone}'`;
    const exist = await queryDocument(existQuery);
    if (exist.length) throw { message: "User already exist" };

    //else procced;
    const query = "INSERT INTO users SET ";
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
    const query = "UPDATE users SET ";
    const condition = ` WHERE id='${req.body.id}'`;
    delete req.body.id;
    const result = await postDocument(query, req.body, condition);
    if (!result.changedRows) throw { message: "Opps! Unable to update" };
    if (existedImg) deleteImage(existedImg);
    res.send({ message: "Updated successfully" });
  } catch (error) {
    if (req.file) deleteImage(req.file.filename);
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const sql = `DELETE FROM users WHERE id = '${req.query.id}'`;
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
    const sql = "INSERT INTO target_commision SET ";
    const result = await postDocument(sql, req.body);
    if (!result.insertId) throw { message: "Could not insert" };
    res.send({ message: "Target added successfully" });
  } catch (error) {
    next(error);
  }
}

async function updateTarget(req, res, next) {
  try {
    const sql = "UPDATE target_commision SET ";
    const opt = ` WHERE id = '${req.query.id}'`;
    let status = "";
    const target = req.body.data;
    if (target.status === "running") {
      if (target.remainingAmount === 0) {
        status = "achieved";
        const sql = "INSERT INTO achieved_commition SET ";
        const data = {
          user_id: target.user_id,
          target_commission_id: target.id,
          commission: target.targetedAmount * (target.commission / 100),
        };
        await postDocument(sql, data);
      } else status = "failed";
    } else status = "running";

    const result = await postDocument(sql, { status }, opt);
    if (!result.changedRows) throw { message: "Couldn't update" };
    res.send({ message: "updated successfully" });
  } catch (error) {
    next(error);
  }
}

async function balance_transfer(req, res, next) {
  try {
    const sql = "INSERT INTO pending_balance_transfer SET ";
    const result = await postDocument(sql, req.body);
    if (!result.insertId) throw { message: "Couldn't addedd successfully" };
    res.send({ message: "Your transaction is in pending" });
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
    let fromUsersql = `UPDATE users SET ${fromUserchangedfeild} - ${req.body.amount} WHERE id = '${req.body.fromUser}'`;
    //till;

    //to user sql;
    const toUserChangeFeild =
      req.body.purpose === "Salary"
        ? "get_salary = get_salary"
        : req.body.purpose === "Incentive"
        ? "incentive = incentive"
        : req.body.purpose === "Purchase Product"
        ? "giveAmount = giveAmount"
        : "haveMoney = haveMoney";
    const touserDbsql =
      req.body.purpose === "Purchase Product" ? "supplier" : "users";
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
      date: new Date().toISOString(),
      amount: req.body.amount,
    };
    //insert transition history;
    const transactionSql = "INSERT INTO transaction SET ";
    await queryDocument(fromUsersql);
    await queryDocument(toUsersql);
    await postDocument(transactionSql, body);

    //delete pending transactions;
    const deleteTransactionSql = `DELETE FROM pending_balance_transfer WHERE id = '${req.body.id}'`;
    await queryDocument(deleteTransactionSql);
    res.send({ message: "Balance rechived successfully" });
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
  updateTarget,
  balance_transfer,
  receive_balance,
};
