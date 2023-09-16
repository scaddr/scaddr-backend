const { createHash } = require("node:crypto")
const { apiSocket } = require("../server.js")
const redisClient = require("../redis.js")
const shuffleArray = require("shuffle-array")

// TODO: currently just random, implement a sequential algorithm
const electUser = async (roomId) => {
    const room = await redisClient.hGet("rooms", roomId)
    const users = room["users"]
    
    // elected user
    return users[Math.floor(Math.random()*users.length)]
}

const pokeQuestion = async (roomId) => {
    const room = JSON.parse(await redisClient.hGet("rooms", roomId))
    const user = electUser(roomId)
    const usernameHash = room["users"][user]

    const sha512 = createHash("sha512")
    sha512.update(`${user}:${usernameHash}`)
    const verificationHash = sha512.digest("hex");

    const cardsNumber = await redisClient.lLen(`room:${roomId}:cards`)
    const correctCard = JSON.parse(await redisClient.lIndex(`room:${roomId}:cards`, Math.floor(Math.random()*cardsNumber)))
    const baitOneCard = JSON.parse(await redisClient.lIndex(`room:${roomId}:cards`, Math.floor(Math.random()*cardsNumber)))
    const baitTwoCard = JSON.parse(await redisClient.lIndex(`room:${roomId}:cards`, Math.floor(Math.random()*cardsNumber)))
    
    const requestBody = {
        verificationHash,
        foreignWord: correctCard["foreignWord"],
        possibleAnswers: shuffleArray([correctCard, baitOneCard, baitTwoCard])
    }

    await redisClient.json.set(`room:${roomId}:game`, requestBody)

    apiSocket.to(`room:${roomId}`).emit("pokeQuestion", requestBody)
}

module.exports = {
    electUser,
    pokeQuestion,
}
