const { postDocument, queryDocument } = require("../mysql");
const { deleteImage } = require("./common");

async function postProduct(req, res, next) {
  try {
    if (req.file) req.body.profile = req.file.filename;
    req.body.stock = req.body.purchase;
    const sql = "INSERT INTO products SET ";
    const result = await postDocument(sql, req.body);
    if (!result.insertId) throw { message: "Opps! unable to add" };
    res.send({ message: "Addedd successfully" });
  } catch (error) {
    next(error);
  }
}

async function getProducts(req, res, next) {
  try {
    const sql = "SELECT * FROM products";
    const result = await queryDocument(sql);
    res.send(result);
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    delete req.body.id;
    if (req.file) req.body.profile = req.file.filename;
    const existedImg = req.body.existedImg;
    delete req.body.existedImg;
    const purchase = req.body.purchase;
    delete req.body.purchase;
    const sql = "UPDATE products SET ";
    const condition = ` WHERE id='${req.query.id}'`;
    const documentUp = await postDocument(sql, req.body, condition);
    let purchaseUp;
    if (purchase) {
      const sql = `UPDATE products SET purchase = purchase + ${purchase}, stock = stock + ${purchase} WHERE id = '${req.query.id}'`;
      purchaseUp = await queryDocument(sql);
    }
    if (!documentUp.affectedRows && !purchaseUp?.affectedRows) {
      throw { message: "Opps! unable to update" };
    }
    if (existedImg) deleteImage(existedImg);
    res.send({ message: "update successfully" });
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const sql = `DELETE FROM products WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Opps! Unable to delete" };
    if (req.query.profile) deleteImage(req.query.profile);
    res.send({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = { postProduct, getProducts, updateProduct, deleteProduct };
