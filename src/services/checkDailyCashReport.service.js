const { queryDocument } = require("./mysql.service");
const { updateMismatchData } = require("./updateMismacthData.service");

async function checkDayilyCashReport() {
  let trying = 1;

  while (true) {
    console.log("Checking iteration:", trying);
    trying++;

    // get database list
    const row = "daily_cash_report";
    const dbList = await queryDocument("SELECT * FROM db_list");
    let anyUpdate = false; // Flag to know if any update happened

    for (const db of dbList) {
      // get report data from database
      const sql = `SELECT * FROM ${db.name}.${row} ORDER BY id ASC`;
      let data = await queryDocument(sql);

      if (!data.length) continue;

      let prevClosing = 0;
      let prevMarketDue = 0;

      for (let index = 0; index < data.length; index++) {
        const item = data[index];

        // initialize for first item
        if (index === 0) {
          prevClosing = item.closing;
          prevMarketDue = item.marketDue;
          continue;
        }

        // 1. Check opening == previous closing
        if (item.opening !== prevClosing) {
          console.log({
            message: "opening not equal to previous closing",
            row,
            db: db.name,
            prevItem: data[index - 1],
            item,
            index,
          });

          // Fix it
          await updateMismatchData({
            database: db.name,
            row,
            feildId: item.id,
            data: { opening: prevClosing },
          });

          anyUpdate = true;
          break; // stop here, will re-fetch
        }

        // 2. Check marketDue == prevMarketDue + dueSale - collection
        const expectedMarketDue =
          prevMarketDue + item.dueSale - item.collection;
        if (item.marketDue !== expectedMarketDue) {
          await updateMismatchData({
            database: db.name,
            row,
            feildId: item.id,
            data: { marketDue: expectedMarketDue },
          });

          console.log({
            message:
              "marketDue mismatch, corrected to dueSale - collection formula",
            row,
            db: db.name,
            id: item.id,
            prevMarketDue,
            currentMarketDue: item.marketDue,
            actualMarketDue: expectedMarketDue,
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

          console.log({
            message:
              "closing mismatch, corrected to opening + totalSale - dueSale + collection - expense - purchase",
            row,
            db: db.name,
            id: item.id,
            prevClosing,
            currentClosing: item.closing,
            actualClosing: expectedClosing,
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
        break;
      }
    }

    // Stop the global loop if all is good
    if (!anyUpdate) {
      console.log(`🎉 Successfully validated ${row}`);
      break;
    }
  }
}

module.exports = { checkDayilyCashReport };
