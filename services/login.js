const { queryDocument } = require("../mysql");
const jwt = require("jsonwebtoken");

async function login(req, res, next) {
  try {
    const sql = `SELECT * FROM users WHERE phone = '${req.body.phone}'`;
    const user = await queryDocument(sql);
    if (!user.length) throw { message: "No user found" };
    else {
      const sqlTc = `SELECT * FROM target_commision WHERE user_id = ${user[0].id}`;
      const tc = await queryDocument(sqlTc);
      user[0].targets = tc;
    }
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
    const user = jwt.verify(req.query.token, process.env.tokenSecret);
    const sql = `SELECT * FROM users WHERE phone = '${user.phone}'`;
    const result = await queryDocument(sql);
    if (result.length) {
      const sqlTc = `SELECT * FROM target_commision WHERE user_id = ${result[0].id}`;
      const tc = await queryDocument(sqlTc);
      result[0].targets = tc;
    }
    res.send(result[0]);
  } catch (error) {
    console.log(error);
    error.message = "Login failed";
    next(error);
  }
}

module.exports = { login, checkIsLogin };
