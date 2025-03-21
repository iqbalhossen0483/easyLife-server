const { postDocument, queryDocument } = require("../database/mysql");
const { deleteImage } = require("../libs/deleteImage");

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
    let sql = `SELECT customers.*, users.name as added_by_name FROM ${req.query.db}.customers INNER JOIN ${req.query.db}.users ON users.id = customers.added_by `;
    if (req.query.opt)
      sql = `SELECT ${req.query.opt} FROM ${req.query.db}.customers`;
    if (req.query.id) {
      const allSql = `SELECT id FROM ${req.query.db}.orders WHERE shopId = '${req.query.id}'`;
      const page = parseInt(req.query.page || 0);
      const allOrder = await queryDocument(allSql);

      sql += `WHERE customers.id= '${req.query.id}'`;
      const customers = await queryDocument(sql);

      const orderSql = `SELECT o.*,c.shopName, c.profile, c.address,c.phone FROM ${
        req.query.db
      }.orders o INNER JOIN ${
        req.query.db
      }.customers c ON c.id = o.shopId WHERE o.shopId = '${
        req.query.id
      }' ORDER BY o.date DESC LIMIT ${page * 50}, 50`;
      const orders = await queryDocument(orderSql);

      if (customers.length) customers[0].orders = orders;

      res.send({ count: allOrder.length, data: customers[0] });
    } else if (req.query.search) {
      const search = req.query.search.trim();
      sql += ` WHERE shopName LIKE "%${search}%" OR customers.address LIKE "%${search}%" OR machine_model LIKE "%${search}" OR machine_type LIKE "%${search}"`;
      const customers = await queryDocument(sql);
      res.send(customers);
    } else {
      const allSql = `SELECT id FROM ${req.query.db}.customers`;
      const page = parseInt(req.query.page || 0);

      const allCustomer = await queryDocument(allSql);

      const sql = `SELECT c.*, users.name as added_by_name FROM ${
        req.query.db
      }.customers c INNER JOIN ${
        req.query.db
      }.users ON users.id = c.added_by ORDER BY c.lastOrder DESC LIMIT ${
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
    delete req.body.added_by;
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
    const sql = `DELETE FROM ${req.query.db}.customers WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Unable to delete customer" };
    const profile = req.query.profile;
    if (profile) deleteImage(profile);

    //delete the customer's orders;
    const orderSql = `SELECT id FROM ${req.query.db}.orders WHERE shopId = '${req.query.id}'`;
    const orders = await queryDocument(orderSql);
    for (const order of orders) {
      const deleteOrderSql = `DELETE FROM ${req.query.db}.orders WHERE id = '${order.id}'`;
      const result = await queryDocument(deleteOrderSql);
      if (!result.affectedRows) continue;
      const deleteProductSql = `DELETE FROM ${req.query.db}.orders_products WHERE orderId = '${order.id}'`;
      await queryDocument(deleteProductSql);
    }

    res.send({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = { postCustomer, getCustomers, updateCustomer, deleteCustomer };
