const { queryDocument, postDocument } = require("../mysql");
const { updateStockReport } = require("./order");

async function postProduction(req, res, next) {
  try {
    const productList = req.body.list;
    const stock = req.body.stock;
    delete req.body.stock;
    delete req.body.list;

    //add production data;
    const productionSql = `INSERT INTO ${req.query.db}.production SET `;
    const productionres = await postDocument(productionSql, req.body);

    if (!productionres.insertId) throw "Couldn't add production, Try again";
    //update main product stock;
    const sql = `UPDATE ${req.query.db}.products SET stock = stock + ${req.body.production}, production = production + ${req.body.production}  WHERE id = '${req.body.productId}'`;
    await queryDocument(sql);

    const date = new Date();

    //add production products;
    const productSql = `INSERT INTO ${req.query.db}.production_product SET `;
    productList.forEach(async (product) => {
      const data = {
        productId: product.id,
        production: product.qty,
        production_id: productionres.insertId,
      };
      const item = {
        productId: product.id,
        qty: product.qty,
        stock: product.stock,
      };
      await postDocument(productSql, data);

      //update product stock;
      const sql = `UPDATE ${req.query.db}.products SET stock = stock - ${data.production} WHERE id = '${data.productId}'`;
      await queryDocument(sql);

      //update product report;
      //update daily stock report;
      await updateStockReport(req, "daily_stock_report", item, date, "daily");

      //update monthly stock report;
      await updateStockReport(req, "monthly_stock_report", item, date, "month");

      //update yearly stock report;
      await updateStockReport(req, "yearly_stock_report", item, date, "year");
    });

    //update main product report;
    //update daily stock report;
    const item = {
      productId: req.body.productId,
      purchased: req.body.production,
      stock,
    };
    await updateStockReport(
      req,
      "daily_stock_report",
      item,
      date,
      "daily",
      true
    );

    //update monthly stock report;
    await updateStockReport(
      req,
      "monthly_stock_report",
      item,
      date,
      "month",
      true
    );

    //update yearly stock report;
    await updateStockReport(
      req,
      "yearly_stock_report",
      item,
      date,
      "year",
      true
    );

    res.send({ message: "Production added successfully" });
  } catch (error) {
    next(error);
  }
}

async function getProduction(req, res, next) {
  try {
    const page = parseInt(req.query.page || 0);
    const sql = `SELECT pro.id, pro.production, pro.date, users.name as production_by, products.name as product_name FROM ${
      req.query.db
    }.production pro LEFT JOIN ${
      req.query.db
    }.users ON users.id = pro.production_by INNER JOIN ${
      req.query.db
    }.products ON products.id = pro.productId ORDER BY pro.date DESC LIMIT ${
      page * 50
    },50`;
    const data = await queryDocument(sql);

    const allSql = `SELECT id FROM ${req.query.db}.production`;
    const allData = await queryDocument(allSql);

    for (const production of data) {
      const listSql = `SELECT pro.id, products.name, pro.production FROM ${req.query.db}.production_product pro INNER JOIN ${req.query.db}.products ON products.id = pro.productId  WHERE pro.production_id = ${production.id}`;
      const list = await queryDocument(listSql);
      production.list = list;
    }

    res.send({ count: allData.length, data });
  } catch (error) {
    next(error);
  }
}

module.exports = { postProduction, getProduction };
