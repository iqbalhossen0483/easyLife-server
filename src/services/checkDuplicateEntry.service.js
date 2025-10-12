const { queryDocument } = require("./mysql.service");

async function checkDulicateCashReport() {
  const dbList = await queryDocument("SELECT * FROM db_list");

  for (const db of dbList) {
    const sql = `SELECT * FROM ${db.name}.daily_cash_report WHERE DATE(date) IN (SELECT DATE(date) FROM ${db.name}.daily_cash_report GROUP BY DATE(date) HAVING COUNT(*) > 1) ORDER BY DATE(date)`;
    const data = await queryDocument(sql);
    if (!data.length) {
      console.log("No duplicate found");
      continue;
    }

    // divide into 2 pairs;
    const pairs = [];
    for (let index = 0; index < data.length; index += 2) {
      pairs.push(data.slice(index, index + 2));
    }

    for (let index = 0; index < pairs.length; index++) {
      const data = {
        totalSale: pairs[index][0].totalSale + pairs[index][1].totalSale,
        dueSale: pairs[index][0].dueSale + pairs[index][1].dueSale,
        collection: pairs[index][0].collection + pairs[index][1].collection,
        expense: pairs[index][0].expense + pairs[index][1].expense,
        purchase: pairs[index][0].purchase + pairs[index][1].purchase,
      };
      const updateSql = `UPDATE ${db.name}.daily_cash_report SET totalSale = ${data.totalSale}, dueSale = ${data.dueSale}, collection = ${data.collection}, expense = ${data.expense}, purchase = ${data.purchase} WHERE id = ${pairs[index][0].id}`;
      await queryDocument(updateSql);

      // remove duplicate;
      const deleteSql = `DELETE FROM ${db.name}.daily_cash_report WHERE id = ${pairs[index][1].id}`;
      await queryDocument(deleteSql);
      console.log("Deleted" + pairs[index][1].id);
    }
  }
}

module.exports = checkDulicateCashReport;
