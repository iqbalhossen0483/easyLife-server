const mysql = require("mysql2/promise");
const { config } = require("../config/config");

async function mySql() {
  const db = await mysql.createConnection({
    host: config.database.host,
    user: config.database.user,
    database: config.database.database,
    password: config.database.password,
    port: config.database.port,
    connectionLimit: 10,
    waitForConnections: true,
    dateStrings: true,
  });
  return db;
}

const queryDocument = async (query) => {
  const connection = await mySql();
  const result = await connection.execute(query);
  await connection.end();
  return result[0];
};

const postDocument = async (query, doc, option = undefined) => {
  const connection = await mySql();
  let data = "";
  Object.entries(doc).forEach(([key, value]) => {
    if (data) {
      data += `, ${key} = '${value}'`;
    } else data += `${key} = '${value}'`;
  });
  if (option) data += option;
  const result = await connection.execute(query + data);
  await connection.end();
  return result[0];
};

module.exports = { queryDocument, postDocument };
