const { postDocument, queryDocument } = require("../mysql");
const { deleteImage } = require("./common");

async function postCustomer(req, res, next) {
  try {
    const checkSql = `SELECT id FROM customers WHERE shopName = '${req.body.shopName}' AND address = '${req.body.address}'`;
    const isExist = await queryDocument(checkSql);
    if (isExist.length) throw { message: "Already added the customer" };

    if (req.file) req.body.profile = req.file.filename;
    const sql = "INSERT INTO customers SET ";
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
    let sql = "SELECT * FROM customers ";
    if (req.query.id) sql += `WHERE id= '${req.query.id}'`;
    const customers = await queryDocument(sql);
    res.send(customers);
  } catch (error) {
    next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const sql = `DELETE FROM customers WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Opps! Unable to delete" };
    if (req.query.profile) deleteImage(req.query.profile);
    res.send({ message: "Deleted successfylly" });
  } catch (error) {
    next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const existedImg = req.body.existedImg;
    delete req.body.existedImg;
    delete req.body.id;
    if (req.file) req.body.profile = req.file.filename;
    const sql = "UPDATE customers SET ";
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

module.exports = { postCustomer, getCustomers, deleteCustomer, updateCustomer };
