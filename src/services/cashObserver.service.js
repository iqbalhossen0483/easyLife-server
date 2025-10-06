const { queryDocument } = require("./mysql.service");

async function cashReportObserver() {
  const rows = [
    "daily_cash_report",
    "monthly_cash_report",
    "yearly_cash_report",
  ];
  const dbList = await queryDocument("SELECT * FROM db_list");
  for (const db of dbList) {
    for (const row of rows) {
      await handleReport({ row, databaseName: db.name });
      console.log(db.name, row);
    }
  }
}

async function handleReport({ row, databaseName }) {
  const date = new Date();
  const month = date.toLocaleString("en-us", { month: "long" });
  const year = date.getFullYear();

  let isExiststockSql = `SELECT id FROM ${databaseName}.${row} `;
  if (row === "monthly_cash_report") {
    isExiststockSql += `WHERE month = '${month}' AND year = '${year}'`;
  } else if (row === "yearly_cash_report") {
    isExiststockSql += `WHERE year = '${year}'`;
  } else isExiststockSql += "WHERE DATE(`date`) = CURDATE()";

  const isExist = await queryDocument(isExiststockSql);

  if (isExist.length) return;

  let prevSql = `SELECT report.closing, report.marketDue FROM ${databaseName}.${row} report ORDER BY report.id DESC LIMIT 1`;
  const [prevData] = await queryDocument(prevSql);
  if (prevData) {
    const opening = prevData.closing;
    const marketDue = prevData.marketDue;
    const closing = opening;
    let newSql = `INSERT INTO ${databaseName}.${row} SET opening = ${opening}, marketDue = ${marketDue}, closing = ${closing}`;
    if (row === "monthly_cash_report") {
      newSql += ` ,month = '${month}', year = ${year}`;
    } else if (row === "yearly_cash_report") newSql += ` ,year = ${year}`;
    await queryDocument(newSql);
  } else {
    let newSql = `INSERT INTO ${databaseName}.${row} SET opening = 0, marketDue = 0, closing = 0`;
    if (row === "monthly_cash_report") {
      newSql += ` ,month = '${month}', year = ${year}`;
    } else if (row === "yearly_cash_report") newSql += ` ,year = ${year}`;
    await queryDocument(newSql);
  }
}

module.exports = { cashReportObserver };
