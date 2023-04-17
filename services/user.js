const { postDocument, queryDocument } = require("../mysql");
const bcrypt = require("bcrypt");

function getUser(req, res, next) {
  res.send({ user: "id" });
}

async function postUser(req, res, next) {
  try {
    //check is exist;
    const existQuery = `SELECT id FROM users WHERE phone = '${req.body.phone}'`;
    const exist = await queryDocument(existQuery);
    if (exist.length) throw { message: "User already exist" };

    //else procced;
    const password = await bcrypt.hash(req.body.password, 10);
    req.body.password = password;
    const query = "INSERT INTO users SET ";
    const result = await postDocument(query, req.body);
    if (result.insertId) res.send({ message: "User addedd successfully" });
    else throw { message: "Opps!, unable to add" };
  } catch (error) {
    next(error);
  }
}

module.exports = { getUser, postUser };
