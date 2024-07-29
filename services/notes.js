const { postDocument, queryDocument } = require("../mysql");

async function postNotes(req, res, next) {
  try {
    const sql = `INSERT INTO ${req.query.db}.notes SET `;
    const result = await postDocument(sql, req.body);
    if (!result.insertId) throw { message: "Opps! unable to add" };
    res.send({ message: "Added successfully" });
  } catch (error) {
    next(error);
  }
}

async function getNotes(req, res, next) {
  try {
    const sql = `SELECT * FROM ${req.query.db}.notes WHERE userId = '${req.query.userId}'`;
    const result = await queryDocument(sql);
    res.send(result);
  } catch (error) {
    next(error);
  }
}

async function updateNote(req, res, next) {
  try {
    delete req.body.id;
    delete req.body.userId;
    const sql = `UPDATE ${req.query.db}.notes SET `;
    const condition = ` WHERE id='${req.query.id}'`;
    const result = await postDocument(sql, req.body, condition);
    if (!result.affectedRows) throw { message: "Opps! unable to update" };
    res.send({ message: "update successfully" });
  } catch (error) {
    next(error);
  }
}

async function removeNotes(req, res, next) {
  try {
    const sql = `DELETE FROM ${req.query.db}.notes WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Opps! unable to delete" };
    res.send({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = { postNotes, getNotes, updateNote, removeNotes };
