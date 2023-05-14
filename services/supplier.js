const { postDocument, queryDocument } = require("../mysql");

async function postSuppier(req, res, next) {
  try {
    console.log(req.body);
    // const sql = "INSERT INTO notes SET ";
    // const result = await postDocument(sql, req.body);
    // if (!result.insertId) throw { message: "Opps! unable to add" };
    res.send({ message: "Added successfully" });
  } catch (error) {
    next(error);
  }
}

async function getSupplier(req, res, next) {
  try {
    // const sql = `SELECT * FROM notes WHERE userId = '${req.query.userId}'`;
    // const result = await queryDocument(sql);
    // res.send(result);
  } catch (error) {
    next(error);
  }
}

async function updateSupplier(req, res, next) {
  try {
    // delete req.body.id;
    // delete req.body.userId;
    // const sql = "UPDATE notes SET ";
    // const condition = ` WHERE id='${req.query.id}'`;
    // const result = await postDocument(sql, req.body, condition);
    // if (!result.affectedRows) throw { message: "Opps! unable to update" };
    // res.send({ message: "update successfully" });
  } catch (error) {
    next(error);
  }
}

async function deleteSupplier(req, res, next) {
  try {
    // const sql = `DELETE FROM notes WHERE id = '${req.query.id}'`;
    // const result = await queryDocument(sql);
    // if (!result.affectedRows) throw { message: "Opps! unable to delete" };
    // res.send({ message: "Deleted successfully" });
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
