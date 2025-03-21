const { queryDocument, postDocument } = require("../database/mysql");

async function getData(req, res, next) {
  if (req.query.cashReport) {
    getSpecificCashReport(req, res, next);
  } else if (req.query.stockReport) {
    getSpecificStockReport(req, res, next);
  } else getInialData(req, res, next);
}

async function getInialData(req, res, next) {
  try {
    let stockReportSql = `SELECT d.*, p.shortName as name, p.sl,p.type FROM ${req.query.db}.daily_stock_report d INNER JOIN ${req.query.db}.products p `;
    stockReportSql +=
      "ON d.productId = p.id WHERE DATE(`date`) = CURDATE() ORDER BY p.sl ASC";
    const stockReport = await queryDocument(stockReportSql);

    const productSql = `SELECT * FROM ${req.query.db}.products`;
    const products = await queryDocument(productSql);

    const usersSql = `SELECT id,name,debt,haveMoney FROM ${req.query.db}.users WHERE haveMoney != 0 OR debt != 0`;
    const users = await queryDocument(usersSql);

    let cashReportSql = `SELECT * FROM ${req.query.db}.daily_cash_report `;
    cashReportSql += "WHERE DATE(`date`) = CURDATE()";
    const cashReport = await queryDocument(cashReportSql);

    const data = {
      stockReport,
      products,
      users,
      cashReport: cashReport[0] || noCashReport,
    };

    res.send(data);
  } catch (error) {
    next(error);
  }
}

async function getSpecificCashReport(req, res, next) {
  try {
    const { method, date, year } = req.query;
    const table =
      method === "date"
        ? "daily_cash_report"
        : method === "month"
        ? "monthly_cash_report"
        : "yearly_cash_report";
    let sql = `SELECT * FROM ${req.query.db}.${table} WHERE `;

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

async function getSpecificStockReport(req, res, next) {
  try {
    const { method, date, year } = req.query;
    const table =
      method === "date"
        ? "daily_stock_report"
        : method === "month"
        ? "monthly_stock_report"
        : "yearly_stock_report";

    let sql = `SELECT d.*,p.shortName as name FROM ${req.query.db}.${table} d INNER JOIN ${req.query.db}.products p ON p.id = d.productId WHERE `;

    if (method === "date") sql += `DATE(d.date) = '${date.slice(0, 10)}'`;
    else if (method === "month") {
      sql += `d.month = '${date}' AND d.year = '${year}'`;
    } else sql += `d.year = ${date}`;

    sql += " ORDER BY p.sl ASC";
    const cashReport = await queryDocument(sql);
    res.send(cashReport);
  } catch (error) {
    next(error);
  }
}

async function sendNotification(req, res, next) {
  try {
    const sql = `SELECT id FROM ${req.query.db}.orders WHERE status='undelivered'`;
    const orders = await queryDocument(sql);
    res.send(orders);
  } catch (error) {
    next(error);
  }
}

async function transations(req, res, next) {
  try {
    let sql = `SELECT t.*, fu.name as fromUserName, tu.name as toUserName, ts.name as toSuppilerName  FROM ${req.query.db}.transaction t LEFT JOIN ${req.query.db}.users fu ON t.fromUser = fu.id LEFT JOIN ${req.query.db}.users tu ON t.toUser = tu.id AND purpose != 'Purchase Product' LEFT JOIN ${req.query.db}.supplier ts ON t.toUser = ts.id AND purpose = 'Purchase Product' `;

    const search = req.query.search?.trim();
    const fromdate = req.query.from
      ? new Date(req.query.from).toISOString()
      : "";
    const enddate = req.query.end ? new Date(req.query.end).toISOString() : "";
    const user = req.query.user_id;

    sql += `${search || enddate || user ? "WHERE " : ""} ${
      search
        ? `(fu.name LIKE '%${search}%' OR tu.name LIKE '%${search}%' OR ts.name LIKE '%${search}%') `
        : ""
    } `;
    sql += `${search && enddate ? "AND " : ""} ${
      enddate ? `t.date >= '${fromdate}' AND t.date <= '${enddate}'` : ""
    }`;
    sql += `${(search || enddate) && user ? `AND ` : ""} ${
      user ? `t.fromUser = '${user}' OR t.toUser = '${user}'` : ""
    }`;
    const alldata = await queryDocument(sql);

    const page = parseInt(req.query.page || 0);
    sql += ` ORDER BY t.date DESC LIMIT ${page * 50}, 50`;
    const result = await queryDocument(sql);
    res.send({ count: alldata.length, data: result });
  } catch (error) {
    next(error);
  }
}

async function getPendingCommission(req, res, next) {
  try {
    const achiveSql = `SELECT ac.*, users.name, users.phone, tc.start_date, tc.end_date, tc.targetedAmnt, tc.achiveAmnt, tc.status, users.id as user_id FROM ${req.query.db}.pending_commition ac INNER JOIN ${req.query.db}.users ON users.id = ac.user_id INNER JOIN ${req.query.db}.target_commision tc ON ac.target_commission_id = tc.id`;
    const achieve = await queryDocument(achiveSql);
    const runngingsql = `SELECT tc.*, users.name, users.phone, users.id as user_id FROM ${req.query.db}.target_commision tc INNER JOIN ${req.query.db}.users ON users.id = tc.user_id WHERE tc.status = 'running' AND tc.user_id != '${req.query.id}'`;
    const running = await queryDocument(runngingsql);
    res.send({ achieve, running });
  } catch (error) {
    next(error);
  }
}

async function achieveCommission(req, res, next) {
  try {
    const achiveSql = `UPDATE ${req.query.db}.pending_commition SET achieved = '1' WHERE id = '${req.body.id}'`;
    await queryDocument(achiveSql);
    delete req.body.id;
    const sql = `INSERT INTO ${req.query.db}.pending_balance_transfer SET `;
    const result = await postDocument(sql, req.body);
    if (!result.insertId) throw { message: "Couldn't addedd successfully" };

    res.send({ message: "Your transaction is in pending" });
  } catch (error) {
    next(error);
  }
}

async function updateSiteinfo(req, res, next) {
  try {
    const sql = "UPDATE db_list SET ";
    const condition = `WHERE id = '${req.query.id}'`;
    const result = await postDocument(sql, req.body, condition);
    if (!result.changedRows) throw { message: "Could not update app info" };
    res.send({ message: "Updated app info successfully" });
  } catch (error) {
    next(error);
  }
}

async function deletePendingCommition(req, res, next) {
  try {
    const sql = `DELETE From ${req.query.db}.target_commision WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Could not delete" };
    res.send({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

async function chartData(req, res, next) {
  try {
    let saleSql = `SELECT totalSale, dueSale,collection,expense,marketDue, ${
      req.query.method === "Month" ? "date" : "month"
    } FROM ${req.query.db}.${
      req.query.method === "Month" ? "daily_cash_report" : "monthly_cash_report"
    } WHERE `;
    const date = new Date(req.query.date);

    if (req.query.method === "Month") {
      const firstDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      ).toISOString();
      const lastDay = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        1
      ).toISOString();
      saleSql += `date <= '${lastDay}' AND date >= '${firstDay}'`;
    } else {
      const year = date.getFullYear();
      saleSql += `year = '${year}'`;
    }

    const data = await queryDocument(saleSql);
    res.send(data);
  } catch (error) {
    next(error);
  }
}
async function pichartData(req, res, next) {
  try {
    let saleSql = `SELECT * FROM ${req.query.db}.${
      req.query.method === "Month"
        ? "monthly_cash_report"
        : "yearly_cash_report"
    } WHERE `;

    const date = new Date(req.query.date);
    if (req.query.method === "Month") {
      const month = date.toLocaleString("en-bd", { month: "long" });
      const year = date.getFullYear();
      saleSql += `month='${month}' AND year=${year}`;
    } else {
      const year = date.getFullYear();
      saleSql += `year = ${year}`;
    }

    const data = await queryDocument(saleSql);
    res.send(data);
  } catch (error) {
    next(error);
  }
}
async function productChartData(req, res, next) {
  try {
    let saleSql = `SELECT st.*, products.shortName as name FROM ${
      req.query.db
    }.${
      req.query.method === "Month"
        ? "monthly_stock_report"
        : "yearly_stock_report"
    } st INNER JOIN ${
      req.query.db
    }.products ON products.id = st.productId WHERE `;
    const date = new Date(req.query.date);

    if (req.query.method === "Month") {
      const month = date.toLocaleString("en-bd", { month: "long" });
      const year = date.getFullYear();
      saleSql += `month = '${month}' AND year = '${year}'`;
    } else {
      const year = date.getFullYear();
      saleSql += `year = '${year}'`;
    }

    const data = await queryDocument(saleSql);
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

module.exports = {
  getData,
  sendNotification,
  transations,
  getPendingCommission,
  achieveCommission,
  updateSiteinfo,
  deletePendingCommition,
  chartData,
  pichartData,
  productChartData,
};
