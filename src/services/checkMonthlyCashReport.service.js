const { queryDocument } = require("./mysql.service");

async function checkMonthlyCashReport() {
  const row = "monthly_cash_report";
  const dbList = await queryDocument("SELECT * FROM db_list");
  for (const db of dbList) {
    // get report data from database
    const sql = `SELECT * FROM ${db.name}.${row} ORDER BY id ASC`;
    let data = await queryDocument(sql);

    if (!data.length) continue;
    console.log(data.length);
  }
}

module.exports = { checkMonthlyCashReport };
