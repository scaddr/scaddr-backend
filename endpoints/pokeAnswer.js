const redisClient = require("../redis.js")
const { pokeQuestion } = require("../functions/gameplayFunctions")
const { sleep } = require("../functions/generalFunctions")
const { apiSocket } = require("../server.js")

const pokeAnswer = async (data, callback, socket, socketData) => {
    try {
        const roomId = typeof data?.roomId === "string" ? (data.roomId).trim() : ""
        const username = typeof data?.username === "string" ? (data.username).trim() : ""
        const usernameHash = typeof data?.usernameHash === "string" ? (data.usernameHash).trim() : ""
        const userChoice = typeof data?.userChoice === "string" ? data.userChoice : ""

        if (roomId == "") {
            throw new Error("Invalid room ID submitted")
        }

        if (username == "" || username == "system") {
            throw new Error("Invalid username submitted")
        }

        if (usernameHash == "") {
            throw new Error("Invalid username hash submitted")
        }

        // user hash hvalidation
        const roomInformation = JSON.parse(await redisClient.hGet("rooms", roomId))

        if (!(username in roomInformation["users"])) {
            throw new Error("Username does not exist in this room")
        }

        if (usernameHash !== roomInformation["users"][username]["usernameHash"]) {
            throw new Error("Username hash outdated") 
        }

        // interrogated user validation
        const answerCard = await redisClient.json.get(`room:${roomId}:answer`) 

        if (username !== answerCard["user"]) {
            throw new Error("Given user account is not being interrogated currently")
        }

        if (answerCard["answered"]) {
            throw new Error("Question already answered")
        }

        // user choice validation
        const definitions = answerCard["card"]["definitions"]

        if (!(definitions.includes(userChoice))) {
            roomInformation["users"][username]["wrong"]++; 

            apiSocket.to(`room:${roomId}`).emit("choiceValidation", {
                status: "ok",
                result: "wrong",
                userChoice,
                correctAnswer: definitions[0]
            })
        } else {
            roomInformation["users"][username]["correct"]++; 

            apiSocket.to(`room:${roomId}`).emit("choiceValidation", {
                status: "ok",
                result: "correct",
                userChoice
            })
        }

        answerCard["answered"] = true
        await redisClient.json.set(`room:${roomId}:answer`, "$", answerCard)

        // write updated player score to database
        await redisClient.hSet("rooms", roomId, JSON.stringify(roomInformation))

        // sleep 2 seconds
        await sleep(2000)

        // poke a new question
        pokeQuestion(roomId)

    } catch (e) {
        console.error(e)
        // TODO: add callback / return the error the the client
    }
}

module.exports = {
    pokeAnswer
}
