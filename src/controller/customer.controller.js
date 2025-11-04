const { postDocument, queryDocument } = require("../services/mysql.service");
const { deleteImage } = require("../services/common.service");

async function postCustomer(req, res, next) {
  try {
    const checkSql = `SELECT id FROM ${req.query.db}.customers WHERE shopName = '${req.body.shopName}' AND address = '${req.body.address}'`;
    const isExist = await queryDocument(checkSql);
    if (isExist.length) throw { message: "Already added the customer" };
    if (req.file) req.body.profile = req.file.filename;

    const sql = `INSERT INTO ${req.query.db}.customers SET `;
    const result = await postDocument(sql, req.body);
    if (!result.insertId) throw { message: "Opps! Unable to add" };
    res.send({ message: "Added successfully" });
  } catch (error) {
    if (req.file) deleteImage(req.file.filename);
    next(error);
  }
}

async function getCustomers(req, res, next) {
  try {
    let sql = "";
    if (req.query.opt) {
      sql = `SELECT ${req.query.opt} FROM ${req.query.db}.customers`;
    } else {
      sql = `SELECT customers.*, users.name as added_by_name FROM ${req.query.db}.customers INNER JOIN ${req.query.db}.users ON users.id = customers.added_by`;
    }

    if (req.query.id) {
      const page = parseInt(req.query.page || 0);

      const orderCountSql = `SELECT id FROM ${req.query.db}.orders WHERE shopId = '${req.query.id}'`;
      const orderCount = await queryDocument(orderCountSql);

      sql += ` WHERE customers.id= '${req.query.id}'`;
      const customerData = await queryDocument(sql);

      if (!customerData.length) throw { message: "No shop found", status: 404 };
      const customer = customerData[0];

      const orderSql = `SELECT o.*,c.shopName, c.profile, c.address,c.phone FROM ${
        req.query.db
      }.orders o INNER JOIN ${
        req.query.db
      }.customers c ON c.id = o.shopId WHERE o.shopId = '${
        req.query.id
      }' ORDER BY o.date DESC LIMIT ${page * 50}, 50`;
      const orders = await queryDocument(orderSql);

      customer.orders = orders;

      res.send({ success: true, count: orderCount.length, data: customer });
    } else if (req.query.search) {
      const search = req.query.search.trim();
      sql += ` WHERE customers.isDeleted = 0 AND shopName LIKE "%${search}%" OR customers.address LIKE "%${search}%" OR machine_model LIKE "%${search}" OR machine_type LIKE "%${search}"`;
      const customers = await queryDocument(sql);

      res.send(customers);
    } else {
      const allSql = `SELECT id FROM ${req.query.db}.customers WHERE isDeleted = 0`;
      const page = parseInt(req.query.page || 0);

      const allCustomer = await queryDocument(allSql);

      const sql = `SELECT c.*, users.name as added_by_name FROM ${
        req.query.db
      }.customers c INNER JOIN ${
        req.query.db
      }.users ON users.id = c.added_by WHERE c.isDeleted = 0 ORDER BY c.lastOrder DESC LIMIT ${
        page * 50
      },50`;
      const customers = await queryDocument(sql);
      res.send({ count: allCustomer.length, data: customers });
    }
  } catch (error) {
    next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const existedImg = req.body.existedImg;
    delete req.body.existedImg;
    delete req.body.id;
    delete req.body.added_by_name;
    if (req.file) req.body.profile = req.file.filename;
    const sql = `UPDATE ${req.query.db}.customers SET `;
    const condition = `WHERE id= '${req.query.id}'`;
    const result = await postDocument(sql, req.body, condition);
    if (!result.changedRows) throw { message: "Opps! Unable to update" };
    if (existedImg) deleteImage(existedImg);
    res.send({ message: "Updated successfully" });
  } catch (error) {
    if (req.file) deleteImage(req.file.filename);
    next(error);
  }
}
async function deleteCustomer(req, res, next) {
  try {
    // soft delete customer  by setting isDeleted = 1
    const sql = `UPDATE ${req.query.db}.customers SET isDeleted = 1 WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Unable to delete customer" };

    res.send({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = { postCustomer, getCustomers, updateCustomer, deleteCustomer };
