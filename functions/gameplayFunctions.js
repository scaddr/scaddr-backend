const { apiSocket } = require("../server.js")
const redisClient = require("../redis.js")
const shuffleArray = require("shuffle-array")

// TODO: currently just random, implement a sequential algorithm
const electUser = async (roomId) => {
    const room = JSON.parse(await redisClient.hGet("rooms", roomId))
    const users = Object.keys(room["users"])
    
    // elected user
    return users[Math.floor(Math.random()*users.length)]
}

const pokeQuestion = async (roomId) => {
    const user = await electUser(roomId)

    const cardsNumber = await redisClient.lLen(`room:${roomId}:cards`)
    const correctCard = JSON.parse(await redisClient.lIndex(`room:${roomId}:cards`, Math.floor(Math.random()*cardsNumber)))
    const baitOneCard = JSON.parse(await redisClient.lIndex(`room:${roomId}:cards`, Math.floor(Math.random()*cardsNumber)))
    const baitTwoCard = JSON.parse(await redisClient.lIndex(`room:${roomId}:cards`, Math.floor(Math.random()*cardsNumber)))

    const shuffledCards = shuffleArray([
        correctCard["definitions"][0],
        baitOneCard["definitions"][0],
        baitTwoCard["definitions"][0]
    ])
    
    // save the ansewr into the database 
    const answerBody = {
        user,
        card: correctCard,
        baits: [baitOneCard, baitTwoCard]
    }
    await redisClient.json.set(`room:${roomId}:answer`, "$", answerBody)

    // save the question into the database
    const questionBody = {
        user,
        question: correctCard["foreignWord"],
        possibleAnswers: shuffledCards
    }
    await redisClient.json.set(`room:${roomId}:question`, "$", questionBody)

    const requestBody = {
        status: "ok",
        user,
        question: correctCard["foreignWord"],
        possibleAnswers: shuffledCards
    }

    apiSocket.to(`room:${roomId}`).emit("pokeQuestion", requestBody)
}

module.exports = {
    electUser,
    pokeQuestion,
}
