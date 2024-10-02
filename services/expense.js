const { postDocument, queryDocument } = require("../mysql");
const { updateCashReport } = require("./order");

async function addExpenseType(req, res, next) {
  try {
    const sql = `INSERT INTO ${req.query.db}.expense_type SET `;
    const result = await postDocument(sql, req.body);
    if (!result.insertId) throw { messase: "Ops! Unable to save" };
    res.send({ messase: "Saved successfully" });
  } catch (error) {
    next(error);
  }
}

async function getexpenseTypes(req, res, next) {
  try {
    const sql = `SELECT * FROM ${req.query.db}.expense_type`;
    const result = await queryDocument(sql);
    res.send(result);
  } catch (error) {
    next(error);
  }
}

async function editexpenseType(req, res, next) {
  try {
    const sql = `UPDATE ${req.query.db}.expense_type SET title = '${req.body.title}' WHERE id = '${req.body.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { messase: "Ops! Unable to edit" };
    res.send({ messase: "Edited successfully" });
  } catch (error) {
    next(error);
  }
}

async function deleteexpenseType(req, res, next) {
  try {
    const sql = `DELETE FROM ${req.query.db}.expense_type WHERE id = '${req.body.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { messase: "Ops! Unable to delete" };
    res.send({ messase: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

async function declineExpense(req, res, next) {
  try {
    const sql = `DELETE FROM ${req.query.db}.pending_expense WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { messase: "Ops! Unable to delete" };
    res.send({ messase: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

async function addExpenseReport(req, res, next) {
  try {
    const data = req.body;

    const userDesignation = data.userDesignation;
    delete data.userDesignation;
    if (userDesignation === "Admin") return addReport(req, data, res, next);
    const sql = `INSERT INTO ${req.query.db}.pending_expense SET `;
    const result = await postDocument(sql, data);
    if (!result.insertId) throw { message: "Opps!, Couldn't sending request" };

    res.send({ message: "Request sent successfully" });
  } catch (error) {
    next(error);
  }
}

async function addReport(req, data, res, next, updateUser = true) {
  try {
    //update user profile
    if (updateUser) {
      const usersql = `UPDATE ${req.query.db}.users SET haveMoney = haveMoney - ${data.amount} WHERE id = '${data.created_by}'`;
      await queryDocument(usersql);
    }

    //insert or update expense information;
    const insertsql = `INSERT INTO ${req.query.db}.expense_info SET `;
    await postDocument(insertsql, data);

    //update repoerts;
    //update daily cash report;
    const date = new Date();
    const payload = { expense: data.amount };
    await updateCashReport(
      req,
      "daily_cash_report",
      payload,
      date,
      false,
      true
    );

    //update monthly cash report;
    await updateCashReport(
      req,
      "monthly_cash_report",
      payload,
      date,
      false,
      true
    );

    //update yearly cash report;
    await updateCashReport(
      req,
      "yearly_cash_report",
      payload,
      date,
      false,
      true
    );
    res.send({ message: "Expense added successfully" });
  } catch (error) {
    next(error);
  }
}

async function getExpenseReports(req, res, next) {
  try {
    if (req.query.pending === "true") {
      let sql = `SELECT e.*, users.name as userName FROM ${req.query.db}.pending_expense e INNER JOIN ${req.query.db}.users ON users.id = e.created_by`;
      const result = await queryDocument(sql);
      res.send({
        data: result,
        pendingExpense: result.length,
        type: "pending",
      });
    } else {
      let sql = `SELECT e.*, users.name as userName FROM ${req.query.db}.expense_info e INNER JOIN ${req.query.db}.users ON users.id = e.created_by `;
      const page = parseInt(req.query.page || 0);
      const search = req.query.search?.trim();
      const fromdate = req.query.from
        ? new Date(req.query.from).toISOString().slice(0, 10)
        : "";
      const enddate = req.query.end
        ? new Date(req.query.end).toISOString().slice(0, 10)
        : "";
      const user = req.query.user_id;

      sql += `${search || enddate || user ? "WHERE " : ""} ${
        search
          ? `(users.name LIKE '%${search}%' OR e.type LIKE '%${search}%') `
          : ""
      }`;
      sql += `${search && user ? `AND ` : ""} ${
        user ? `e.created_by = '${user}' ` : ""
      }`;
      sql += `${(search || user) && enddate ? `AND ` : ""} ${
        enddate ? `e.date >= '${fromdate}' AND e.date <= '${enddate}' ` : ""
      }`;

      const allCustomer = await queryDocument(sql);

      sql += `ORDER BY e.date DESC LIMIT ${page * 50}, 50`;
      const result = await queryDocument(sql);

      const data = { count: allCustomer.length, data: result };

      //pending requests;
      if (!req.query.user_id) {
        const pendingsql = `SELECT id FROM ${req.query.db}.pending_expense`;
        const pendingExpense = await queryDocument(pendingsql);
        data.pendingExpense = pendingExpense.length;
      }

      res.send(data);
    }
  } catch (error) {
    next(error);
  }
}

async function achieveExpense(req, res, next) {
  try {
    const id = req.body.id;
    delete req.body.userName;
    delete req.body.id;
    await addReport(req, req.body, res, next);
    const sql = `DELETE FROM ${req.query.db}.pending_expense WHERE id = '${id}'`;
    await queryDocument(sql);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addExpenseType,
  getexpenseTypes,
  editexpenseType,
  deleteexpenseType,
  addExpenseReport,
  getExpenseReports,
  achieveExpense,
  declineExpense,
  addReport,
};
