const { queryDocument } = require("../services/mysql.service");
const jwt = require("jsonwebtoken");

async function login(req, res, next) {
  try {
    // check database;
    const dbSql = `SELECT * FROM db_list WHERE id = '${req.body.db}'`;
    const [database] = await queryDocument(dbSql);
    if (!database) {
      throw { message: "There is no authorised user", status: 401 };
    }

    // check user;
    const sql = `SELECT * FROM ${database.name}.users WHERE phone = '${req.body.phone}' AND password = '${req.body.password}'`;
    const [user] = await queryDocument(sql);
    if (!user) {
      throw { message: "There is no authorised user", status: 401 };
    }

    // get database data;
    const primaryUserSql = `SELECT name FROM ${database.name}.users WHERE id = ${database.primary_user}`;
    const primaryUser = await queryDocument(primaryUserSql);
    database.primary_user_name = primaryUser[0]?.name;
    const combinedSql = `
      SELECT 
        (SELECT COUNT(*) FROM \`${database.name}\`.users) AS total_users,
        (SELECT COUNT(*) FROM \`${database.name}\`.products) AS total_products,
        (SELECT COUNT(*) FROM \`${database.name}\`.customers) AS total_customers
    `;
    const [databaseCount] = await queryDocument(combinedSql);
    if (!databaseCount) {
      throw { message: "There is no authorised user", status: 401 };
    }
    database.current_user = databaseCount.total_users;
    database.current_product = databaseCount.total_products;
    database.current_customer = databaseCount.total_customers;

    // get user data;
    // generate token;
    delete user.password;
    const token = jwt.sign({ ...user, database }, process.env.tokenSecret);

    // get target commision of this user;
    const sqlTargetCommision = `SELECT * FROM ${database.name}.target_commision WHERE user_id = ${user.id}`;
    const targetCommision = await queryDocument(sqlTargetCommision);
    user.targets = targetCommision;

    // send response;
    res.send({ message: "Login successfull", token, data: { user, database } });
  } catch (error) {
    next(error);
  }
}

async function checkIsLogin(req, res, next) {
  try {
    const token = jwt.verify(req.query.token, process.env.tokenSecret);
    const database = token.database.name;
    if (!database) throw { message: "Access denied", status: 401 };

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
    res.send({ user: user[0], database: db[0] });
  } catch (error) {
    error.message = "Login failed";
    next(error);
  }
}

module.exports = { login, checkIsLogin };
