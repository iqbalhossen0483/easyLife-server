const cron = require("node-cron");
const moment = require("moment-timezone");
const cashReportObserver = require("./cashObserver.service");
const { commisionObserver } = require("./commisionObserver.service");
const { config } = require("../config/config");

function scheduleDailyTasks() {
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const now = moment().tz(config.timeZone).format("YYYY-MM-DD HH:mm:ss");
        console.log(`[${now}] Running daily end-of-day tasks...`);

        cashReportObserver();
        commisionObserver();

        console.log(`[${now}] Daily tasks completed successfully.`);
      } catch (error) {
        console.error("Error running daily tasks:", error);
      }
    },
    {
      scheduled: true,
      timezone: config.timeZone,
    }
  );
}

module.exports = scheduleDailyTasks;
