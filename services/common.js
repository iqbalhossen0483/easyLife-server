const fs = require("fs");
const { queryDocument, postDocument } = require("../mysql");

async function deleteImage(fileName) {
  try {
    if (fileName) fs.unlinkSync("public/" + fileName);
  } catch (error) {
    console.log(error);
  }
}

let observer = undefined;

async function cashObserver(req) {
  if (observer) clearInterval(observer);

  await handleCashReport(req, "daily_cash_report");
  await handleCashReport(req, "monthly_cash_report");
  await handleCashReport(req, "yearly_cash_report");

  const date = new Date();
  const prevmonth = date.getMonth();
  const prevyear = date.getFullYear();

  observer = setInterval(async () => {
    const date = new Date();
    const time = `${date.getHours()}:${date.getMinutes()}`;
    const currenmonth = date.getMonth();
    const currenyear = date.getFullYear();
    if (time === "00:00") await handleCashReport(req, "daily_cash_report");
    if (prevmonth !== currenmonth)
      await handleCashReport(req, "monthly_cash_report");
    if (prevyear !== currenyear)
      await handleCashReport(req, "yearly_cash_report");
  }, 1000 * 60);
}

async function handleCashReport(req, row) {
  const date = new Date();
  const month = date.toLocaleString("en-us", { month: "long" });
  const year = date.getFullYear();

  let isExiststockSql = `SELECT id FROM ${req.query.db}.${row} `;
  if (row === "monthly_cash_report") {
    isExiststockSql += `WHERE month = '${month}' AND year = '${year}'`;
  } else if (row === "yearly_cash_report") {
    isExiststockSql += `WHERE year = '${year}'`;
  } else isExiststockSql += "WHERE DATE(`date`) = CURDATE()";

  const isExist = await queryDocument(isExiststockSql);

  if (isExist.length) return;
  else {
    let prevSql = `SELECT row.closing, row.marketDue FROM ${req.query.db}.${row} row ORDER BY row.id DESC LIMIT 1`;
    const prevData = await queryDocument(prevSql);
    if (prevData.length) {
      const opening = prevData[0].closing;
      const marketDue = prevData[0].marketDue;
      const closing = opening;
      let newSql = `INSERT INTO ${req.query.db}.${row} SET opening = ${opening}, marketDue = ${marketDue}, closing = ${closing}`;
      if (row === "monthly_cash_report") {
        newSql += ` ,month = '${month}', year = ${year}`;
      } else if (row === "yearly_cash_report") newSql += ` ,year = ${year}`;
      await queryDocument(newSql);
    } else {
      const newSql = `INSERT INTO ${req.query.db}.${row} SET opening = 0, marketDue = 0, closing = 0`;
      if (row === "monthly_cash_report") {
        newSql += ` ,month = '${month}', year = ${year}`;
      } else if (row === "yearly_cash_report") newSql += ` ,year = ${year}`;
      await queryDocument(newSql);
    }
  }
}

let firstTimer = undefined;
let secondTimer = undefined;
async function commisionObserver(req, id, endTime) {
  if (firstTimer) clearTimeout(firstTimer);
  if (secondTimer) clearTimeout(secondTimer);

  firstTimer = setTimeout(() => {
    secondTimer = setTimeout(async () => {
      try {
        await handleCommition(req, id);
      } catch (error) {
        console.log(error);
      }
    }, endTime / 2);
  }, endTime / 2);
}

async function handleCommition(req, id) {
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
  cashObserver,
  commisionObserver,
  handleCommition,
};
