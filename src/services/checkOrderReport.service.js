const { queryDocument } = require("./mysql.service");

async function checkOrderReport() {
  const dbList = await queryDocument("SELECT * FROM db_list");
  if (!dbList.length) return console.log("No database found");

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
    if (!data.length) return console.log("No data found");
    const parsedData = data.map((item) => {
      return { ...item, collections: JSON.parse(item.collections) };
    });
    let totalDue = 0;
    const dueReport = [];

    for (const order of parsedData) {
      totalDue += order.due;
      if (order.due > 0 || order.collections[0].id) {
        const collection = order.collections.reduce(
          (acc, cur) => acc + cur.amount,
          0
        );
        dueReport.push({
          id: order.id,
          totalSale: order.totalSale,
          dueSale: order.due + collection,
          collection: collection,
          payment: order.payment,
          currentDue: order.due,
          date: order.date,
          shouldUpdate: collection !== order.collection,
        });
      }
    }

    for (const report of dueReport) {
      if (report.shouldUpdate) {
        const sql = `UPDATE ${db.name}.orders SET collection = ${report.collection}, dueSale = ${report.dueSale} WHERE id = ${report.id}`;
        await queryDocument(sql);
        console.log("updated " + report.id);
      }
    }
  }
}

module.exports = checkOrderReport;
