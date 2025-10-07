const { postDocument } = require("./mysql.service");

async function updateMismatchData({ database, row, feildId, data }) {
  try {
    const sql = `UPDATE ${database}.${row} SET `;
    const condition = `WHERE id = '${feildId}'`;
    await postDocument(sql, data, condition);
    console.log("successfully updated");
  } catch (error) {
    console.log(error);
  }
}

module.exports = { updateMismatchData };
