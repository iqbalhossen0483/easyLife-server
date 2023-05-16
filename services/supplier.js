const { postDocument, queryDocument } = require("../mysql");
const { deleteImage } = require("./common");

async function postSuppier(req, res, next) {
  try {
    req.body.profile = req.file.filename;
    const sql = "INSERT INTO supplier SET ";
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
    const sql = "SELECT * FROM supplier";
    const result = await queryDocument(sql);
    res.send(result);
  } catch (error) {
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
    const sql = "UPDATE supplier SET ";
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
    const sql = `DELETE FROM supplier WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Opps! unable to delete" };
    if (req.query.profile) deleteImage(req.query.profile);
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
