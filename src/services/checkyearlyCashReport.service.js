const { queryDocument } = require("./mysql.service");
const { updateMismatchData } = require("./updateMismacthData.service");

async function checkyearlyCashReport() {
  const row = "yearly_cash_report";
  const dbList = await queryDocument("SELECT * FROM db_list");

  for (const db of dbList) {
    let anyUpdate = false;
    let retryCount = 1;

    while (true) {
      console.log("Checking iteration:", retryCount);
      retryCount++;
      anyUpdate = false;

      const sql = `SELECT * FROM ${db.name}.${row} ORDER BY id ASC`;
      const data = await queryDocument(sql);
      let prevClosing = 0;
      let prevMarketDue = 0;

      for (let index = 0; index < data.length; index++) {
        const item = data[index];

        // initialize for first item
        if (index === 0) {
          prevClosing = item.opening;
        }

        // 1. get daily report data between start and end date
        const year = item.year;
        const dailySql = `SELECT * FROM ${db.name}.monthly_cash_report WHERE year = ${year} `;
        const monthlyData = await queryDocument(dailySql);

        if (!monthlyData.length) continue;

        const totalSale = monthlyData.reduce(
          (acc, cur) => acc + cur.totalSale,
          0
        );
        const dueSale = monthlyData.reduce((acc, cur) => acc + cur.dueSale, 0);
        const collection = monthlyData.reduce(
          (acc, cur) => acc + cur.collection,
          0
        );
        const expense = monthlyData.reduce((acc, cur) => acc + cur.expense, 0);
        const purchase = monthlyData.reduce(
          (acc, cur) => acc + cur.purchase,
          0
        );

        // 2. check  if any mismatch
        if (prevClosing !== item.opening) {
          await updateMismatchData({
            database: db.name,
            row: row,
            feildId: item.id,
            data: { opening: prevClosing },
          });

          anyUpdate = true;
          break;
        }
        const expectedClosing =
          item.opening +
          item.totalSale -
          item.dueSale +
          item.collection -
          item.expense -
          item.purchase;
        if (expectedClosing !== item.closing) {
          await updateMismatchData({
            database: db.name,
            row: row,
            feildId: item.id,
            data: { closing: expectedClosing },
          });

          anyUpdate = true;
          break;
        }
        if (item.marketDue !== prevMarketDue + item.dueSale - item.collection) {
          await updateMismatchData({
            database: db.name,
            row: row,
            feildId: item.id,
            data: { marketDue: prevMarketDue + item.dueSale - item.collection },
          });
          anyUpdate = true;
          break;
        }
        if (totalSale !== item.totalSale) {
          await updateMismatchData({
            database: db.name,
            row: row,
            feildId: item.id,
            data: { totalSale },
          });

          anyUpdate = true;
          break;
        }
        if (dueSale !== item.dueSale) {
          await updateMismatchData({
            database: db.name,
            row: row,
            feildId: item.id,
            data: { dueSale },
          });

          anyUpdate = true;
          break;
        }
        if (collection !== item.collection) {
          await updateMismatchData({
            database: db.name,
            row: row,
            feildId: item.id,
            data: { collection },
          });

          anyUpdate = true;
          break;
        }
        if (expense !== item.expense) {
          await updateMismatchData({
            database: db.name,
            row: row,
            feildId: item.id,
            data: { expense },
          });

          anyUpdate = true;
          break;
        }
        if (purchase !== item.purchase) {
          await updateMismatchData({
            database: db.name,
            row: row,
            feildId: item.id,
            data: { purchase },
          });

          anyUpdate = true;
          break;
        }

        // Update trackers
        prevClosing = item.closing;
        prevMarketDue = item.marketDue;
      }

      if (anyUpdate) {
        console.log(
          `🔁 Re-fetching ${db.name}.${row} after update to re-validate...`
        );
      }

      if (!anyUpdate) {
        console.log(`🎉 Successfully validated ${db.name}.${row}`);
        break;
      }
    }
  }
}

module.exports = checkyearlyCashReport;
