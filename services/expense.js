const { postDocument, queryDocument } = require("../mysql");
const { updateCashReport } = require("./order");

async function addExpenseType(req, res, next) {
  try {
    const sql = "INSERT INTO expense_type SET ";
    const result = await postDocument(sql, req.body);
    if (!result.insertId) throw { messase: "Ops! Unable to save" };
    res.send({ messase: "Saved successfully" });
  } catch (error) {
    next(error);
  }
}

async function getexpenseTypes(req, res, next) {
  try {
    const sql = "SELECT * FROM expense_type";
    const result = await queryDocument(sql);
    res.send(result);
  } catch (error) {
    next(error);
  }
}

async function editexpenseType(req, res, next) {
  try {
    const sql = `UPDATE expense_type SET title = '${req.body.title}' WHERE id = '${req.body.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { messase: "Ops! Unable to edit" };
    res.send({ messase: "Edited successfully" });
  } catch (error) {
    next(error);
  }
}

async function deleteexpenseType(req, res, next) {
  try {
    const sql = `DELETE FROM expense_type WHERE id = '${req.body.id}'`;
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
    if (userDesignation === "Admin") return addReport(data, res, next);
    const sql = "INSERT INTO pending_expense SET ";
    const result = await postDocument(sql, data);
    if (!result.insertId) throw { message: "Opps!, Couldn't sending request" };

    res.send({ message: "Request sent successfully" });
  } catch (error) {
    next(error);
  }
}

async function addReport(data, res, next) {
  try {
    //update user profile;
    const usersql = `UPDATE users SET haveMoney = haveMoney - ${data.amount} WHERE id = '${data.created_by}'`;
    await queryDocument(usersql);

    //insert or update expense information;
    const isExistSql = `SELECT id FROM expense_info WHERE date = '${data.date}' AND type = '${data.type}' AND  created_by = '${data.created_by}'`;
    const isExist = await queryDocument(isExistSql);
    if (isExist.length) {
      const updatesql = `UPDATE expense_info SET amount = amount + ${data.amount} WHERE id = '${isExist[0].id}'`;
      await queryDocument(updatesql);
    } else {
      const insertsql = `INSERT INTO expense_info SET `;
      await postDocument(insertsql, data);
    }

    //update repoerts;
    //update daily cash report;
    const date = new Date();
    const payload = { expense: data.amount };
    await updateCashReport(
      "daily_cash_report",
      payload,
      date,
      "date",
      false,
      true
    );

    //update monthly cash report;
    await updateCashReport(
      "monthly_cash_report",
      payload,
      date,
      "month",
      false,
      true
    );

    //update yearly cash report;
    await updateCashReport(
      "yearly_cash_report",
      payload,
      date,
      "year",
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
      let sql =
        "SELECT e.*, users.name as userName FROM pending_expense e INNER JOIN users ON users.id = e.created_by ";
      const result = await queryDocument(sql);
      res.send({ data: result, pendingExpense: result.length });
    } else {
      let sql =
        "SELECT e.*, users.name as userName FROM expense_info e INNER JOIN users ON users.id = e.created_by ";
      if (req.query.search) {
        sql += `WHERE users.name LIKE '%${req.query.search}%' OR e.type LIKE '%${req.query.search}%' `;
      }
      if (req.query.from) {
        const fromdate = new Date(req.query.from).toISOString();
        const enddate = new Date(req.query.end).toISOString();
        if (req.query.search)
          sql += `AND e.date >= '${fromdate}' AND e.date <= '${enddate}' `;
        else sql += `WHERE e.date >= '${fromdate}' AND e.date <= '${enddate}' `;
      }
      sql += "ORDER BY e.date DESC";
      const result = await queryDocument(sql);

      //pending requests;
      const pendingsql = "SELECT id FROM pending_expense";
      const pendingExpense = await queryDocument(pendingsql);
      const data = {};
      data.pendingExpense = pendingExpense.length;
      data.data = result;
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
    await addReport(req.body, res, next);
    const sql = `DELETE FROM pending_expense WHERE id = '${id}'`;
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
};
