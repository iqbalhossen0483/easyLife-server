const mysql = require("mysql2/promise");

async function mySql() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "iqbal",
    database: "switchcafebd_controller",
    password: "60483", // Iqbal@0483
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
