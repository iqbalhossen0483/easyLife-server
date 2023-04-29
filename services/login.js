const { queryDocument } = require("../mysql");
const jwt = require("jsonwebtoken");

async function login(req, res, next) {
  try {
    const sql = `SELECT * FROM users WHERE phone = '${req.body.phone}'`;
    const user = await queryDocument(sql);
    if (!user.length) throw { message: "No user found" };
    if (user[0].password !== req.body.password) {
      throw { message: "Wrong password" };
    }
    delete user[0].password;
    const token = jwt.sign(user[0], process.env.tokenSecret);
    res.send({ message: "Login successfull", token, user: user[0] });
  } catch (error) {
    next(error);
  }
}

async function checkIsLogin(req, res, next) {
  try {
    let user;
    user = jwt.verify(req.query.token, process.env.tokenSecret);
    if (req.query.updateUser) {
      const sql = `SELECT * FROM users WHERE phone = '${user.phone}'`;
      const result = await queryDocument(sql);
      user = result[0];
    }
    delete user.iat;
    res.send(user);
  } catch (error) {
    next(error);
  }
}

module.exports = { login, checkIsLogin };
