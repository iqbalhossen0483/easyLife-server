const Redis = require("ioredis");
const { config } = require("./config");

const redisConfig = {
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword,
};

class RedisClient {
  constructor(options) {
    this.options = options || redisConfig;
    this.redis = new Redis(this.getRedisOptions());
    this.redis.on("connect", () => {
      console.log("Connected to Redis Cache Server");
    });
    this.redis.on("error", (err) => {
      console.error("Redis error:", err);
    });
  }

  getRedisOptions() {
    const { host, port, password } = this.options;
    return {
      host,
      port,
      password,
      maxRetriesPerRequest: null, // Prevent unnecessary retries
      enableOfflineQueue: false, // Prevent queuing commands when Redis is down
      retryStrategy: (times) => Math.min(times * 50, 2000), // Limit retries
    };
  }

  // Set key-value pair
  async set({ key, value, lock = false, expire = 300 }) {
    try {
      if (lock) {
        // NX + EX for lock
        const result = await this.redis.set(
          key,
          JSON.stringify(value),
          "NX",
          "EX",
          expire
        );
        return result === "OK"; // true if lock acquired
      } else {
        // Normal set with expiration
        await this.redis.set(key, JSON.stringify(value), "EX", expire);
        return true;
      }
    } catch (error) {
      console.error(`Error setting key '${key}' in Redis:`, error);
      return false;
    }
  }

  // Get key value
  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(
        `Error retrieving value for key '${key}' from Redis:`,
        error
      );
      return null;
    }
  }

  // Remove key
  async remove(key) {
    try {
      const result = await this.redis.del(key);
      if (result === 1) {
        console.log(`Key '${key}' removed successfully from Redis.`);
      } else {
        console.log(`Key '${key}' does not exist in Redis.`);
      }
    } catch (error) {
      console.error(`Error removing key '${key}' from Redis:`, error);
    }
  }

  // Close connection
  async close() {
    try {
      await this.redis.quit();
      console.log("Redis connection closed.");
    } catch (error) {
      console.error("Error closing Redis connection:", error);
    }
  }

  // Pop item from list
  async lpop(listKey) {
    try {
      const item = await this.redis.lpop(listKey);
      if (item) {
        console.log(`Item '${item}' popped from list '${listKey}'.`);
        return JSON.parse(item);
      } else {
        console.log(`List '${listKey}' is empty.`);
        return null;
      }
    } catch (error) {
      console.error(`Error popping item from list '${listKey}':`, error);
      return null;
    }
  }

  // Get list length
  async llen(listKey) {
    try {
      const length = await this.redis.llen(listKey);
      console.log(`Length of list '${listKey}': ${length}`);
      return length;
    } catch (error) {
      console.error(`Error getting length of list '${listKey}':`, error);
      return 0;
    }
  }

  // Push item to list
  async rpush(listKey, item) {
    try {
      await this.redis.rpush(listKey, JSON.stringify(item));
      console.log(`Item '${item}' pushed to list '${listKey}'.`);
    } catch (error) {
      console.error(`Error pushing item to list '${listKey}':`, error);
    }
  }

  // Flush all data
  async flushAll() {
    try {
      await this.redis.flushall();
      console.log("All Redis data flushed.");
    } catch (error) {
      console.error("Error flushing all Redis data:", error);
    }
  }
}

// Export singleton instance
const redisInstance = new RedisClient();
Object.freeze(redisInstance); // Prevent new instances

module.exports = { redis: redisInstance };
