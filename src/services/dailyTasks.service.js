const cron = require("node-cron");
const moment = require("moment-timezone");
const cashReportObserver = require("./cashObserver.service");
const { commisionObserver } = require("./commisionObserver.service");
const { config } = require("../config/config");
const { redis } = require("../config/redis");

function scheduleDailyTasks() {
  cron.schedule(
    "0 0 * * *",
    async () => {
      const LOCK_KEY = "daily_tasks_lock";
      try {
        const acquired = await redis.set({
          key: LOCK_KEY,
          value: "locked",
          lock: true,
          expire: 300,
        });
        if (!acquired) {
          console.log(
            "Daily task skipped — another instance is already running."
          );
          return;
        }

        const now = moment().tz(config.timeZone).format("YYYY-MM-DD HH:mm:ss");
        console.log(`[${now}] Running daily end-of-day tasks...`);

        cashReportObserver();
        commisionObserver();

        console.log(`[${now}] Daily tasks completed successfully.`);
      } catch (error) {
        console.error("Error running daily tasks:", error);
      } finally {
        await redis.remove(LOCK_KEY);
        console.log("Daily task finished — lock released.");
      }
    },
    {
      scheduled: true,
      timezone: config.timeZone,
    }
  );
}

module.exports = scheduleDailyTasks;
