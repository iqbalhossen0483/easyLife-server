const { postDocument, queryDocument } = require("../services/mysql.service");
const { deleteImage } = require("../services/common.service");

async function postSuppier(req, res, next) {
  try {
    if (req.file) {
      req.body.profile = req.file.filename;
    } else {
      delete req.body.profile;
    }
    const sql = `INSERT INTO ${req.query.db}.supplier SET `;
    const result = await postDocument(sql, req.body);
    if (!result.insertId) throw { message: "Opps! unable to add" };
    res.send({ message: "Added successfully" });
  } catch (error) {
    if (req.file.filename) deleteImage(req.file.filename);
    next(error);
  }
}

async function getSupplier(req, res, next) {
  try {
    if (req.query.id) {
      const sql = `SELECT * FROM ${req.query.db}.supplier WHERE id = '${req.query.id}'`;
      const supplier = await queryDocument(sql);
      const page = parseInt(req.query.page || 0);

      const allOrdersql = `SELECT id FROM ${req.query.db}.purchased WHERE supplier_id = ${req.query.id}`;
      const allOrder = await queryDocument(allOrdersql);

      const ordersSql = `SELECT p.*, users.name FROM ${
        req.query.db
      }.purchased p INNER JOIN ${
        req.query.db
      }.users ON users.id = p.purchased_by WHERE supplier_id = ${
        req.query.id
      } ORDER BY p.date DESC LIMIT ${page * 50}, 50`;
      const orders = await queryDocument(ordersSql);
      supplier[0].orders = orders;
      res.send({ count: allOrder.length, data: supplier[0] });
    } else if (req.query.search) {
      let sql = `SELECT ${req.query.opt ? req.query.opt : "*"} FROM ${
        req.query.db
      }.supplier WHERE name LIKE "%${req.query.search}%" OR phone LIKE "%${
        req.query.search
      }%" AND isDeleted = 0`;
      const result = await queryDocument(sql);
      res.send(result);
    } else {
      let sql = `SELECT * FROM ${req.query.db}.supplier WHERE isDeleted = 0`;
      if (req.query.type) {
        sql = `SELECT *, 'supplier' as type FROM ${req.query.db}.supplier WHERE isDeleted = 0`;
      }
      const result = await queryDocument(sql);
      res.send(result);
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const id = req.body.id;
    let existedImg = req.body.existedImg;
    delete req.body.id;
    delete req.body.existedImg;
    if (existedImg) {
      req.body.profile = req.file.filename;
    }
    const sql = `UPDATE ${req.query.db}.supplier SET `;
    const condition = ` WHERE id='${id}'`;
    const result = await postDocument(sql, req.body, condition);
    if (!result.affectedRows) throw { message: "Opps! unable to update" };
    if (existedImg) deleteImage(existedImg);
    res.send({ message: "update successfully" });
  } catch (error) {
    if (req.file.filename) deleteImage(req.file.filename);
    next(error);
  }
}

async function deleteSupplier(req, res, next) {
  try {
    const sql = `UPDATE ${req.query.db}.supplier SET isDeleted = 1 WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Opps! unable to delete" };
    res.send({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  postSuppier,
  getSupplier,
  updateSupplier,
  deleteSupplier,
};
