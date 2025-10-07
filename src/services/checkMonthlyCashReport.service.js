const { queryDocument } = require("./mysql.service");
const { updateMismatchData } = require("./updateMismacthData.service");

async function checkMonthlyCashReport() {
  const monthValue = {
    January: 1,
    February: 2,
    March: 3,
    April: 4,
    May: 5,
    June: 6,
    July: 7,
    August: 8,
    September: 9,
    October: 10,
    November: 11,
    December: 12,
  };
  const row = "monthly_cash_report";
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
          // retrive market due from daily report
          const dailySql = `SELECT * FROM ${db.name}.daily_cash_report LIMIT 1`;
          const [dailyData] = await queryDocument(dailySql);
          prevMarketDue = dailyData?.marketDue || 0;
        }

        // 1. get start and end date
        const month = monthValue[item.month];
        const year = item.year;
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0));
        endDate.setUTCHours(23, 59, 59);
        const startUtc = startDate.toISOString().slice(0, 19).replace("T", " ");
        const endUtc = endDate.toISOString().slice(0, 19).replace("T", " ");

        // 2. get daily report data between start and end date
        const dailySql = `SELECT * FROM ${db.name}.daily_cash_report WHERE date >= '${startUtc}' AND date <= '${endUtc}'`;
        const dailyData = await queryDocument(dailySql);

        if (!dailyData.length) continue;

        const totalSale = dailyData.reduce(
          (acc, cur) => acc + cur.totalSale,
          0
        );
        const dueSale = dailyData.reduce((acc, cur) => acc + cur.dueSale, 0);
        const collection = dailyData.reduce(
          (acc, cur) => acc + cur.collection,
          0
        );
        const expense = dailyData.reduce((acc, cur) => acc + cur.expense, 0);
        const purchase = dailyData.reduce((acc, cur) => acc + cur.purchase, 0);

        // 3. check  if any mismatch
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

module.exports = { checkMonthlyCashReport };
