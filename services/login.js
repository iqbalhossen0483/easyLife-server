const { queryDocument } = require("../mysql");
const jwt = require("jsonwebtoken");
const { cashObserver } = require("./common");

async function login(req, res, next) {
  try {
    const bdSql = `SELECT * FROM db_list WHERE id = '${req.body.db}'`;
    const db = await queryDocument(bdSql);
    if (!db.length) throw { message: "There is no authorised user" };

    const database = db[0];
    const primaryUserSql = `SELECT name FROM ${database.name}.users WHERE id = ${database.primary_user}`;
    const primaryUser = await queryDocument(primaryUserSql);
    database.primary_user_name = primaryUser[0]?.name;

    //current user quantity;
    const currentUserSql = `SELECT id FROM ${database.name}.users`;
    const currentUser = await queryDocument(currentUserSql);
    database.current_user = currentUser.length - 1;

    //current product quantity;
    const currentProductSql = `SELECT id FROM ${database.name}.products`;
    const currentProduct = await queryDocument(currentProductSql);
    database.current_product = currentProduct.length - 1;

    //current customer quantity;
    const currentCustomerSql = `SELECT id FROM ${database.name}.customers`;
    const currentCustomer = await queryDocument(currentCustomerSql);
    database.current_customer = currentCustomer.length - 1;

    const sql = `SELECT * FROM ${database.name}.users WHERE phone = '${req.body.phone}'`;
    const userdb = await queryDocument(sql);
    if (!userdb.length) throw { message: "There is no authorised user" };

    const user = userdb[0];
    if (user.password !== req.body.password)
      throw { message: "Username Or Password is Wrong" };

    delete user.password;
    const token = jwt.sign({ ...user, database }, process.env.tokenSecret);

    const sqlTc = `SELECT * FROM ${database.name}.target_commision WHERE user_id = ${user.id}`;
    const tc = await queryDocument(sqlTc);
    user.targets = tc;
    req.query.db = database.name;
    await cashObserver(req);
    res.send({ message: "Login successfull", token, data: { user, database } });
  } catch (error) {
    next(error);
  }
}

async function checkIsLogin(req, res, next) {
  try {
    const token = jwt.verify(req.query.token, process.env.tokenSecret);
    const database = token.database.name;
    if (!database) throw { message: "Access denied" };

    const sql = `SELECT * FROM ${database}.users WHERE phone = '${token.phone}'`;
    const user = await queryDocument(sql);
    if (!user.length) throw { message: "Access denied" };

    const sqlTc = `SELECT * FROM ${database}.target_commision WHERE user_id = ${user[0].id}`;
    const tc = await queryDocument(sqlTc);
    user[0].targets = tc;
    4;
    const dbSql = `SELECT db_list.*, user.name as primary_user_name FROM db_list INNER JOIN ${database}.users user ON user.id = db_list.primary_user WHERE db_list.id = '${token.database.id}'`;
    const db = await queryDocument(dbSql);

    //current user;
    const currentUserSql = `SELECT id FROM ${database}.users`;
    const currentUser = await queryDocument(currentUserSql);
    db[0].current_user = currentUser.length - 1;
    //current product;
    const currentProductSql = `SELECT id FROM ${database}.products`;
    const currentProduct = await queryDocument(currentProductSql);
    db[0].current_product = currentProduct.length - 1;
    //current customer;
    const currentCustomerSql = `SELECT id FROM ${database}.customers`;
    const currentCustomer = await queryDocument(currentCustomerSql);
    db[0].current_customer = currentCustomer.length - 1;

    req.query.db = database;
    await cashObserver(req);
    res.send({ user: user[0], database: db[0] });
  } catch (error) {
    error.message = "Login failed";
    next(error);
  }
}

module.exports = { login, checkIsLogin };
