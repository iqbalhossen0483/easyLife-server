require("dotenv").config();

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT,
  timeZone: process.env.TIME_ZONE || "Asia/Dhaka",
  tokenSecret:
    process.env.TOKEN_SECRET || "JSDKJFKASDJKFLJSKJAFKLSDJGKJSDKLGJAEIWJFJK",
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,
  redisPassword: process.env.REDIS_PASS || "",
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  },
};

module.exports = { config };
