const { apiSocket } = require("../server.js")
const redisClient = require("../redis.js")
const shuffleArray = require("shuffle-array")
const { broadcastRoomStatus } = require("./socketFunctions.js")

const switchUser = async (roomId) => {
    const room = JSON.parse(await redisClient.hGet("rooms", roomId))
    const users = Object.keys(room["users"])
    const question = await redisClient.json.get(`room:${roomId}:question`) ?? {}

    // if this is the first question, pick the first user 
    if (!question?.user) {
        return {
            "electedUser": users[0],
        }
    }

    for (let index = 0; index < users.length; index++) {
        // get the location of the current user 
        if (question.user != users[index]) {
            continue
        }

        let next = index+1 < users.length ? index+1 : 0;

        // if we're back to the beginning, start a new round
        if (next == 0) {
            return {
                "electedUser": users[0],
                "newRound": true
            }
        }

        return {
            "electedUser": users[next]
        }
    }

    // default to first user 
    return {
        "electedUser": users[0]
    }
}

const startNewRound = async (roomId) => {
    const room = JSON.parse(await redisClient.hGet("rooms", roomId))

    if (room["status"]["currentRound"] >= room["status"]["maxRounds"]) {
        room["status"]["state"] = "finished"
    } else {
        room["status"]["currentRound"]++;
    }

    // update the room object in DB
    await redisClient.hSet("rooms", roomId, JSON.stringify(room));
    
    // inform users about the room status change
    await broadcastRoomStatus(roomId);
}

const pokeQuestion = async (roomId) => {
    const switchInfo = await switchUser(roomId)

    if (switchInfo?.newRound) {
        startNewRound(roomId);
    }

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
        "user": switchInfo.electedUser,
        card: correctCard,
        baits: [baitOneCard, baitTwoCard]
    }
    await redisClient.json.set(`room:${roomId}:answer`, "$", answerBody)

    // save the question into the database
    const questionBody = {
        "user": switchInfo.electedUser,
        question: correctCard["foreignWord"],
        possibleAnswers: shuffledCards
    }
    await redisClient.json.set(`room:${roomId}:question`, "$", questionBody)

    const requestBody = {
        status: "ok",
        "user": switchInfo.electedUser,
        question: correctCard["foreignWord"],
        possibleAnswers: shuffledCards
    }

    apiSocket.to(`room:${roomId}`).emit("pokeQuestion", requestBody)
}

module.exports = {
    switchUser,
    pokeQuestion,
}
