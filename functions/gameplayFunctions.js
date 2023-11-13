const { apiSocket } = require("../server.js")
const redisClient = require("../redis.js")
const shuffleArray = require("shuffle-array")

const electUser = async (roomId) => {
    const room = JSON.parse(await redisClient.hGet("rooms", roomId))
    const users = Object.keys(room["users"])
    const question = await redisClient.json.get(`room:${roomId}:question`) ?? {}

    // if this is the first question, pick the first user 
    if (!question?.user) {
        return users[0]
    }

    // get the location of the current user 
    for (let index = 0; index < users.length; index++) {
        if (question.user != users[index]) {
            continue
        }

        let next = index+1 < users.length ? index+1 : 0;
        return users[next]
    }

    // default to first user 
    return users[0]
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
    
    // save the answer into the database 
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
