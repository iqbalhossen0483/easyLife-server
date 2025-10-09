const { queryDocument } = require("./mysql.service");

async function checkCustomerDue(databaseName) {
  let totalDue = 0;
  const sql = `SELECT * FROM ${databaseName}.customers WHERE due > 0`;
  const data = await queryDocument(sql);
  for (const customer of data) {
    totalDue += customer.due;
  }
  return totalDue;
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
        res.write(`Updated ${db.name} order ${report.id} \n`);
      }
    }

    const customerDue = await checkCustomerDue(db.name);
    if (customerDue !== totalDue) {
      res.write(
        `Total customer due not equal to total order due in ${db.name} \n
        Total customer due: ${customerDue}
        \n Total order due: ${totalDue}
        \n`
      );
    } else {
      res.write(
        `Total customer due equal to total order due in ${db.name} \n
        Total customer due: ${customerDue}
        \n Total order due: ${totalDue} 
        \n`
      );
    }
  }
}

module.exports = checkOrderReport;
