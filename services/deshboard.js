const { queryDocument, postDocument } = require("../mysql");

async function getData(req, res, next) {
  if (req.query.cashReport) {
    getSpecificCashReport(req, res, next);
  } else if (req.query.stockReport) {
    getSpecificStockReport(req, res, next);
  } else getInialData(req, res, next);
}

async function getInialData(req, res, next) {
  try {
    const stockReportSql =
      "SELECT d.*, p.name FROM daily_stock_report d INNER JOIN products p ON d.productId = p.id WHERE DATE(`date`) = CURDATE()";
    const stockReport = await queryDocument(stockReportSql);

    const productSql = "SELECT * FROM products";
    const products = await queryDocument(productSql);

    const usersSql =
      "SELECT id,name,debt,haveMoney FROM users WHERE haveMoney > 0";
    const users = await queryDocument(usersSql);

    const cashReportSql =
      "SELECT * FROM daily_cash_report WHERE DATE(`date`) = CURDATE()";
    const cashReport = await queryDocument(cashReportSql);

    const data = { stockReport, products, users, cashReport: cashReport[0] };

    if (!data.cashReport) {
      let day = 1;
      let prevDaysCashReport = [];
      while (!prevDaysCashReport.length && day < 10) {
        const prevDaysCashReportSql = `SELECT id, closing FROM daily_cash_report WHERE DATE(date) = DATE_SUB(CURDATE(), INTERVAL ${day} DAY)`;
        prevDaysCashReport = await queryDocument(prevDaysCashReportSql);
        day++;
      }

      if (prevDaysCashReport.length) {
        const prevOpening = prevDaysCashReport[0].closing;
        const insertCashReportSql = `INSERT INTO daily_cash_report SET opening = ${prevOpening}, closing = ${prevOpening}`;
        await queryDocument(insertCashReportSql);

        const cashReportSql =
          "SELECT * FROM daily_cash_report WHERE DATE(`date`) = CURDATE()";
        const cashReport = await queryDocument(cashReportSql);
        data.cashReport = cashReport[0];
      } else data.cashReport = noCashReport;
    }
    res.send(data);
  } catch (error) {
    next(error);
  }
}

async function getSpecificCashReport(req, res, next) {
  try {
    const { method, date, year } = req.query;
    const dataBase =
      method === "date"
        ? "daily_cash_report"
        : method === "month"
        ? "monthly_cash_report"
        : "yearly_cash_report";
    let sql = `SELECT * FROM ${dataBase} WHERE `;

    if (method === "date") sql += `DATE(date) = '${date.slice(0, 10)}'`;
    else if (method === "month") {
      sql += `month = '${date}' AND year = '${year}'`;
    } else sql += `year = ${date}`;

    const cashReport = await queryDocument(sql);
    const data = cashReport.length > 0 ? cashReport[0] : noCashReport;
    res.send(data);
  } catch (error) {
    next(error);
  }
}

const noCashReport = {
  opening: 0,
  todaySale: 0,
  dueSale: 0,
  collection: 0,
  expense: 0,
  purchase: 0,
  cashIn: 0,
  cashOut: 0,
  marketDue: 0,
  closing: 0,
};

async function getSpecificStockReport(req, res, next) {
  try {
    const { method, date, year } = req.query;
    const dataBase =
      method === "date"
        ? "daily_stock_report"
        : method === "month"
        ? "monthly_stock_report"
        : "yearly_stock_report";
    let sql = `SELECT d.*,p.name FROM ${dataBase} d INNER JOIN products p ON p.id = d.productId WHERE `;

    if (method === "date") sql += `DATE(d.date) = '${date.slice(0, 10)}'`;
    else if (method === "month") {
      sql += `d.month = '${date}' AND d.year = '${year}'`;
    } else sql += `d.year = ${date}`;

    const cashReport = await queryDocument(sql);
    res.send(cashReport);
  } catch (error) {
    next(error);
  }
}

async function sendNotification(req, res, next) {
  try {
    const sql = "SELECT id FROM orders WHERE status='undelivered'";
    const orders = await queryDocument(sql);
    res.send(orders);
  } catch (error) {
    next(error);
  }
}

async function transations(req, res, next) {
  try {
    let sql =
      "SELECT t.*, fu.name as fromUserName, tu.name as toUserName, ts.name as toSuppilerName  FROM transaction t LEFT JOIN users fu ON t.fromUser = fu.id LEFT JOIN users tu ON t.toUser = tu.id AND purpose != 'Purchase Product' LEFT JOIN supplier ts ON t.toUser = ts.id AND purpose = 'Purchase Product' ";
    if (req.query.search || req.query.from || req.query.end) {
      sql += `WHERE fu.name LIKE '%${req.query.search}%' OR tu.name LIKE '%${req.query.search}%' OR ts.name LIKE '%${req.query.search}%' `;
      if (req.query.from) {
        const fromdate = new Date(req.query.from).toISOString();
        const enddate = new Date(req.query.end).toISOString();
        sql += `AND t.date >= '${fromdate}' AND t.date <= '${enddate}' `;
      }
    }
    sql += ` ORDER BY t.date DESC`;
    const result = await queryDocument(sql);
    res.send(result);
  } catch (error) {
    console.log(error);
    next(error);
  }
}

async function getPendingCommission(req, res, next) {
  try {
    const sql =
      "SELECT ac.id, ac.commission, users.name, tc.targetedAmount, users.id as user_id FROM achieved_commition ac INNER JOIN users ON users.id = ac.user_id INNER JOIN target_commision tc ON ac.target_commission_id = tc.id";
    const result = await queryDocument(sql);
    res.send(result);
  } catch (error) {
    next(error);
  }
}

async function achieveCommission(req, res, next) {
  try {
    //update to user;
    const toSql = `UPDATE users SET incentive = incentive + ${req.body.commission} WHERE id = '${req.body.user_id}'`;
    const toRes = await queryDocument(toSql);

    if (!toRes.changedRows) throw { message: "Could not send commission" };

    //update from user;
    const fromSql = `UPDATE users SET haveMoney = haveMoney - ${req.body.commission} WHERE id = '${req.body.fromUser}'`;
    const fromRes = await queryDocument(fromSql);

    if (fromRes.changedRows) {
      //delete commission data to temporary table;
      const deleteSql = `DELETE FROM achieved_commition WHERE id = '${req.body.id}'`;
      await queryDocument(deleteSql);
    }
    res.send({ message: "Commision sent successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getData,
  sendNotification,
  transations,
  getPendingCommission,
  achieveCommission,
};
