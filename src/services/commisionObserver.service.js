const { config } = require("../config/config");
const { postDocument, queryDocument } = require("./mysql.service");
const moment = require("moment-timezone");

async function commisionObserver() {
  const dbList = await queryDocument("SELECT * FROM db_list");
  for (const db of dbList) {
    await handleCommission({ db: db.name });
  }
}

async function handleCommission({ db }) {
  const now = moment().tz(config.timeZone).format("YYYY-MM-DD HH:mm:ss");
  const targetSql = `SELECT * FROM ${db}.target_commision WHERE status = 'running' AND end_date < '${now}'`;
  const targets = await queryDocument(targetSql);
  if (!targets.length) return;

  for (const target of targets) {
    let status;
    const sql = `UPDATE ${db}.target_commision SET `;
    const opt = ` WHERE id = '${target.id}'`;

    if (target.achiveAmnt >= target.targetedAmnt) {
      status = "achieved";
      const sql = `INSERT INTO ${db}.pending_commition SET `;
      const payload = {
        user_id: target.user_id,
        target_commission_id: target.id,
        commission: target.targetedAmnt * (target.commission / 100),
      };
      await postDocument(sql, payload);
    } else status = "failed";

    await postDocument(sql, { status }, opt);
  }
}

module.exports = { commisionObserver };
