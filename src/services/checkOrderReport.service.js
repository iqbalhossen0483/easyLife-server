const { queryDocument } = require("./mysql.service");
const { updateMismatchData } = require("./updateMismacthData.service");

async function checkCustomerDue(databaseName) {
  let totalDue = 0;
  const sql = `SELECT * FROM ${databaseName}.customers WHERE due > 0`;
  const data = await queryDocument(sql);
  for (const customer of data) {
    totalDue += customer.due;
  }
  return totalDue;
}

async function checkSalesFromDailyReport(databaseName) {
  let totalSale = 0;
  let dueSale = 0;
  let collection = 0;
  const sql = `SELECT * FROM ${databaseName}.daily_cash_report`;
  const data = await queryDocument(sql);
  for (const report of data) {
    totalSale += report.totalSale;
    dueSale += report.dueSale;
    collection += report.collection;
  }
  return {
    totalSale,
    dueSale,
    collection,
  };
}

async function checkOrderReport(res) {
  const dbList = await queryDocument("SELECT * FROM db_list");

  for (const db of dbList) {
    const sql = `
      SELECT
      o.*, 
      COALESCE( 
        JSON_ARRAYAGG( 
          JSON_OBJECT( 
          'id', c.id,
          'amount', c.amount,
          'orderId', c.orderId,
          'receiverId', c.receiverId, 
          'date', c.date 
          ) 
        ), JSON_ARRAY() 
      ) AS collections
      FROM ${db.name}.orders o 
      LEFT JOIN ${db.name}.collections c 
      ON o.id = c.orderId 
      GROUP BY o.id
    `;

    const data = await queryDocument(sql);
    if (!data.length) return res.write(`No order found in ${db.name} \n`);

    let totalDue = 0;
    let totalSale = 0;
    let collection = 0;
    let dueSale = 0;

    for (const order of data) {
      totalDue += order.due;
      totalSale += order.totalSale;
      collection += order.collection;
      dueSale += order.dueSale;
      if (order.due > 0 || order.collections[0].id) {
        const collection = order.collections.reduce(
          (acc, cur) => acc + cur.amount,
          0
        );
        if (order.due + collection !== order.dueSale) {
          await updateMismatchData({
            database: db.name,
            row: "orders",
            feildId: order.id,
            data: {
              dueSale: order.due + collection,
            },
          });
        }
        if (order.collection !== collection) {
          await updateMismatchData({
            database: db.name,
            row: "orders",
            feildId: order.id,
            data: {
              collection: collection,
            },
          });
        }
      }
    }

    const customerDue = await checkCustomerDue(db.name);
    const sales = await checkSalesFromDailyReport(db.name);
    if (customerDue !== totalDue) {
      res.write(
        `Total customer due not equal to total order due in ${db.name} \n
        Total customer due: ${customerDue} \n
        Total order due: ${totalDue} \n \n
        \n`
      );
    } else {
      res.write(
        `Total customer due not equal to total order due in ${db.name} \n
        Total customer due: ${customerDue} \n
        Total order due: ${totalDue} \n \n
        Total sale (order): ${totalSale} \n
        Total sale (daily report): ${sales.totalSale} \n \n
        Total due sale (order): ${dueSale} \n
        Total due sale (daily report): ${sales.dueSale} \n \n
        Total collection (order): ${collection} \n
        Total collection (daily report): ${sales.collection}
        \n`
      );
    }
  }
}

module.exports = checkOrderReport;
