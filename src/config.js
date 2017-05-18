const redisPort = process.env.REDIS_PORT || 6379
const redisHost = process.env.REDIS_HOST || 'localhost'

export default {
  REDIS_URL: `redis://${redisHost}:${redisPort}`,
  REDIS_PORT: redisPort,
  REDIS_HOST: redisHost,
  redisOpts: {
    redis: {
      port: redisPort,
      host: redisHost
    }
  }
}
