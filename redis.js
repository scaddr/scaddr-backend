const { createClient } = require("redis")

const redisLocation = process.env.REDIS; 
const redisClient = createClient(redisLocation)

// redisClient.on("error", err => {
//     console.log("Redis Client Error", err)
// })
redisClient.on("error", err => {
    console.error(`Redis errored out: ${err}`)
    process.exit()
})

redisClient.connect()

console.log("Successfully established a client connection with the Redis server");
// redis setup

module.exports = redisClient
