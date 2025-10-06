const fs = require("fs");
const { queryDocument, postDocument } = require("./mysql.service");

async function deleteImage(fileName) {
  try {
    if (fileName) fs.unlinkSync("public/" + fileName);
  } catch (error) {
    console.log(error);
  }
}

async function commitionOberver(req, id) {
  const targetSql = `SELECT * FROM ${req.query.db}.target_commision WHERE id = '${id}'`;
  const target = await queryDocument(targetSql);
  if (!target.length) return;

  let status = target[0].status;

  if (status === "running") {
    const sql = `UPDATE ${req.query.db}.target_commision SET `;
    const opt = ` WHERE id = '${target[0].id}'`;

    if (target[0].achiveAmnt >= target[0].targetedAmnt) {
      status = "achieved";
      const sql = `INSERT INTO ${req.query.db}.pending_commition SET `;
      const payload = {
        user_id: target[0].user_id,
        target_commission_id: target[0].id,
        commission: target[0].targetedAmnt * (target[0].commission / 100),
      };
      await postDocument(sql, payload);
    } else status = "failed";

    await postDocument(sql, { status }, opt);
  }
}

module.exports = {
  deleteImage,
  commitionOberver,
};
