const statusCode = require("../config/statusCode");
const { queryDocument } = require("../services/mysql.service");
const jwt = require("jsonwebtoken");

async function login(req, res, next) {
  try {
    // check database;
    const dbSql = `SELECT * FROM db_list WHERE id = '${req.body.db}'`;
    const [database] = await queryDocument(dbSql);
    if (!database) {
      throw {
        message: "There is no authorised user",
        status: statusCode.FORBIDDEN,
      };
    }

    // check user;
    const sql = `SELECT * FROM ${database.name}.users WHERE phone = '${req.body.phone}' AND password = '${req.body.password}' AND isDeleted = 0`;
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
      throw {
        message: "There is no authorised user",
        status: statusCode.UN_AUTHENTICATED,
      };
    }
    database.current_user = databaseCount.total_users;
    database.current_product = databaseCount.total_products;
    database.current_customer = databaseCount.total_customers;

    // get user data;
    // generate token;
    delete user.password;
    const token = jwt.sign({ ...user, database }, process.env.TOKEN_SECRET);

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

async function getProfile(req, res, next) {
  try {
    // extract token and check database;
    const token = jwt.verify(req.query.token, process.env.TOKEN_SECRET);
    const databaseName = token.database.name;
    if (!databaseName)
      throw { message: "Access denied", status: statusCode.FORBIDDEN };

    // check user;
    const sql = `SELECT * FROM ${databaseName}.users WHERE phone = '${token.phone}' AND isDeleted = 0`;
    const [user] = await queryDocument(sql);
    if (!user)
      throw {
        message: "There is no authorised user",
        status: statusCode.UN_AUTHENTICATED,
      };

    // get target commision of this user;
    const sqlTargetCommision = `SELECT * FROM ${databaseName}.target_commision WHERE user_id = ${user.id}`;
    const targetCommision = await queryDocument(sqlTargetCommision);
    user.targets = targetCommision;

    // get database data;
    const dbSql = `SELECT db_list.*, user.name as primary_user_name FROM db_list INNER JOIN ${databaseName}.users user ON user.id = db_list.primary_user WHERE db_list.id = '${token.database.id}'`;
    const [database] = await queryDocument(dbSql);
    if (!database)
      throw {
        message: "Access denied",
        status: statusCode.FORBIDDEN,
      };

    // get database data;
    const combinedSql = `
      SELECT 
        (SELECT COUNT(*) FROM \`${database.name}\`.users) AS total_users,
        (SELECT COUNT(*) FROM \`${database.name}\`.products) AS total_products,
        (SELECT COUNT(*) FROM \`${database.name}\`.customers) AS total_customers
    `;
    const [databaseCount] = await queryDocument(combinedSql);
    if (!databaseCount) {
      throw {
        message: "There is no authorised user",
        status: statusCode.UN_AUTHENTICATED,
      };
    }
    database.current_user = databaseCount.total_users;
    database.current_product = databaseCount.total_products;
    database.current_customer = databaseCount.total_customers;

    req.query.db = databaseName;
    res.send({ user: user, database: database, success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, getProfile };
