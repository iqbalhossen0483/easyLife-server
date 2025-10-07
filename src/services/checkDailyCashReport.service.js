const { queryDocument } = require("./mysql.service");
const { updateMismatchData } = require("./updateMismacthData.service");

async function checkDailyCashReport() {
  const row = "daily_cash_report";
  const dbList = await queryDocument("SELECT * FROM db_list");

  for (const db of dbList) {
    let anyUpdate = false;
    let retryCount = 1;

    while (true) {
      console.log("Checking iteration:", retryCount);
      retryCount++;
      anyUpdate = false;

      const sql = `SELECT * FROM ${db.name}.${row} ORDER BY id ASC`;
      let data = await queryDocument(sql);

      let prevClosing = 0;
      let prevMarketDue = 0;

      for (let index = 0; index < data.length; index++) {
        const item = data[index];

        // initialize for first item
        if (index === 0) {
          prevClosing = item.opening;
        }

        // 1. Check opening == previous closing
        if (item.opening !== prevClosing) {
          await updateMismatchData({
            database: db.name,
            row,
            feildId: item.id,
            data: { opening: prevClosing },
          });

          anyUpdate = true;
          break;
        }

        // 2. Check marketDue == prevMarketDue + dueSale - collection
        const expectedMarketDue =
          prevMarketDue + item.dueSale - item.collection;
        if (index !== 0 && item.marketDue !== expectedMarketDue) {
          await updateMismatchData({
            database: db.name,
            row,
            feildId: item.id,
            data: { marketDue: expectedMarketDue },
          });

          anyUpdate = true;
          break;
        }

        // 3. Check closing == opening + totalSale - dueSale + collection - expense - purchase
        const expectedClosing =
          item.opening +
          item.totalSale -
          item.dueSale +
          item.collection -
          item.expense -
          item.purchase;

        if (item.closing !== expectedClosing) {
          await updateMismatchData({
            database: db.name,
            row,
            feildId: item.id,
            data: { closing: expectedClosing },
          });

          anyUpdate = true;
          break;
        }

        // Update trackers
        prevClosing = item.closing;
        prevMarketDue = item.marketDue;
      }

      // If we updated something, re-fetch & restart this table loop
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

module.exports = { checkDailyCashReport };
