const { sendNotification } = require("./controller/notification.controller");
const statusCode = require("./config/statusCode");
const express = require("express");
const cron = require("node-cron");
const morgan = require("morgan");
const cors = require("cors");
const cashReportObserver = require("./services/cashObserver.service");
const checkMonthlyCashReport = require("./services/checkMonthlyCashReport.service");
const checkDailyCashReport = require("./services/checkDailyCashReport.service");
const checkyearlyCashReport = require("./services/checkyearlyCashReport.service");
const { queryDocument } = require("./services/mysql.service");
const checkDulicateCashReport = require("./services/checkDuplicateEntry.service");
const checkOrderReport = require("./services/checkOrderReport.service");
const moment = require("moment-timezone");
const { updateMismatchData } = require("./services/updateMismacthData.service");
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;

//midleware;
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.static("public"));
app.use((req, res, next) => {
  if (/\.jpg|\.png|\.jpeg|validate-report/.test(req.url)) {
    next();
  } else {
    const database = req.headers.database;
    if (!database) {
      console.log(req.url);
      next({ message: "Access denied", status: statusCode.FORBIDDEN });
    }
    req.query.db = database;
    next();
  }
});

//routes
app.use("/", require("./routes/admin.route"));
app.use("/login", require("./routes/login.route"));
app.use("/user", require("./routes/user.route"));
app.use("/customer", require("./routes/customers.route"));
app.use("/notes", require("./routes/notes.route"));
app.use("/product", require("./routes/products.route"));
app.use("/supplier", require("./routes/supplier.route"));
app.use("/purchase", require("./routes/purchase.route"));
app.use("/order", require("./routes/order.route"));
app.use("/admin", require("./routes/admin.route"));
app.use("/expense", require("./routes/expense.route"));
app.use("/production", require("./routes/production.route"));
app.post("/message", sendNotification);

app.get("/validate-report", async (req, res, next) => {
  try {
    // set header for sse;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // check cash report
    res.write("Checking cash report... \n");
    await cashReportObserver(res);
    res.write("Checking cash report completed \n \n");

    // check cash report
    res.write("Checking Duplicate cash report... \n");
    await checkDulicateCashReport();
    res.write("Checking Duplicate cash report completed \n \n");

    // check cash report
    res.write("Checking daily cash report... \n");
    await checkDailyCashReport();
    res.write("Checking daily cash report completed \n \n");

    // check cash report
    res.write("Checking monthly cash report... \n");
    await checkMonthlyCashReport();
    res.write("Checking monthly cash report completed \n \n");

    // check cash report
    res.write("Checking yearly cash report... \n");
    await checkyearlyCashReport();
    res.write("Checking yearly cash report completed \n \n");

    // check order report
    res.write("Checking order report... \n");
    await checkOrderReport(res);
    res.write("Checking order report completed \n \n");

    res.write("Report validation completed. Please check your database");
    res.end();
  } catch (error) {
    console.log(error);
    res.write(`Report validation failed. error: ${error.message}`);
    res.end();
  }
});

// check totalSale, dueSale and collection from order table with daily cash report table;
// async function checkCashReportWithOrderReport() {
//   const dbList = await queryDocument("SELECT * FROM db_list");

//   for (const db of dbList) {
//     // retrive data from daily cash report table;
//     const dailyCashReport = await queryDocument(
//       `SELECT * FROM ${db.name}.daily_cash_report`
//     );

//     for (const report of dailyCashReport) {
//       const startDate = moment.tz(report.date, "Asia/Dhaka").startOf("day");
//       const endDate = moment.tz(report.date, "Asia/Dhaka").endOf("day");

//       const startUtc = startDate.format("YYYY-MM-DD HH:mm:ss");
//       const endUtc = endDate.format("YYYY-MM-DD HH:mm:ss");

//       const order = await queryDocument(
//         `SELECT * FROM ${db.name}.orders WHERE date >= '${startUtc}' AND date <= '${endUtc}'`
//       );
//       if (!order.length) {
//         console.log(`No order found in ${db.name}`);
//         continue;
//       }

//       const totalSale = order.reduce((acc, item) => acc + item.totalSale, 0);
//       const dueSale = order.reduce((acc, item) => acc + item.dueSale, 0);
//       if (totalSale !== report.totalSale) {
//         await updateMismatchData({
//           database: db.name,
//           row: "daily_cash_report",
//           feildId: report.id,
//           data: {
//             totalSale: totalSale,
//           },
//         });
//       }
//       if (dueSale !== report.dueSale) {
//         await updateMismatchData({
//           database: db.name,
//           row: "daily_cash_report",
//           feildId: report.id,
//           data: {
//             dueSale: dueSale,
//           },
//         });
//       }
//     }
//   }
// }
async function checkCashReportWithOrderReport() {
  const dbList = await queryDocument("SELECT * FROM db_list");

  for (const db of dbList) {
    // retrive data from daily cash report table;
    const dailyCashReport = await queryDocument(
      `SELECT * FROM ${db.name}.daily_cash_report`
    );

    for (const report of dailyCashReport) {
      const startDate = moment.tz(report.date, "Asia/Dhaka").startOf("day");
      const endDate = moment.tz(report.date, "Asia/Dhaka").endOf("day");

      const startUtc = startDate.format("YYYY-MM-DD HH:mm:ss");
      const endUtc = endDate.format("YYYY-MM-DD HH:mm:ss");

      const collection = await queryDocument(
        `SELECT * FROM ${db.name}.collections WHERE date >= '${startUtc}' AND date <= '${endUtc}'`
      );
      if (!collection.length) {
        console.log(`No collections found in ${db.name}`);
        continue;
      }

      const totalCollection = collection.reduce(
        (acc, item) => acc + item.amount,
        0
      );

      if (totalCollection !== report.collection) {
        await updateMismatchData({
          database: db.name,
          row: "daily_cash_report",
          feildId: report.id,
          data: {
            collection: totalCollection,
          },
        });
      }
    }
  }
}

// checkCashReportWithOrderReport();

// cron job
cron.schedule("59 23 * * *", () => {
  cashReportObserver();
});

//error handler;
app.use((err, req, res, next) => {
  console.log(err);

  const status = err.statusCode || statusCode.SERVER_ERROR;
  res.status(status).send({
    message: err.message || "Internal server error",
    success: false,
    status: status,
  });
});

//app listener;
app.listen(port, () => {
  console.log("its running", port);
});
