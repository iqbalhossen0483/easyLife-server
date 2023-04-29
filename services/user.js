const { postDocument, queryDocument } = require("../mysql");
const { deleteImage } = require("./common");

async function getUser(req, res, next) {
  try {
    const sql = "SELECT * FROM users";
    const result = await queryDocument(sql);
    res.send(result);
  } catch (error) {
    next(error);
  }
}

async function postUser(req, res, next) {
  try {
    //check is exist;
    const existQuery = `SELECT id FROM users WHERE phone = '${req.body.phone}'`;
    const exist = await queryDocument(existQuery);
    if (exist.length) throw { message: "User already exist" };

    //else procced;
    const query = "INSERT INTO users SET ";
    const result = await postDocument(query, req.body);
    if (result.insertId) res.send({ message: "User addedd successfully" });
    else throw { message: "Opps!, unable to add" };
  } catch (error) {
    next(error);
  }
}

async function putUser(req, res, next) {
  try {
    const existedImg = req.body.existedImg;
    delete req.body.existedImg;
    if (req.file) req.body.profile = req.file.filename;
    const query = "UPDATE users SET ";
    const condition = ` WHERE id='${req.body.id}'`;
    delete req.body.id;
    const result = await postDocument(query, req.body, condition);
    if (!result.changedRows) throw { message: "Opps! Unable to update" };
    if (existedImg) deleteImage(existedImg);
    res.send({ message: "Updated successfully" });
  } catch (error) {
    if (req.file) deleteImage(req.file.filename);
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const sql = `DELETE FROM users WHERE id = '${req.query.id}'`;
    const result = await queryDocument(sql);
    if (!result.affectedRows) throw { message: "Opps! Unable to delete" };
    if (req.query.profile) deleteImage(req.query.profile);
    res.send({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = { getUser, postUser, deleteUser, putUser };
