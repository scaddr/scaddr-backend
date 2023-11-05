const redisClient = require("../redis.js")
const { pokeQuestion } = require("../functions/gameplayFunctions")
const { sleep } = require("../functions/generalFunctions")
const { apiSocket } = require("../server.js")

const pokeAnswer = async (data, callback, socket, socketData) => {
    try {
        const roomId = data?.roomId ?? ""
        const username = (data?.username ?? "")
        const usernameHash = (data?.usernameHash ?? "")
        const userChoice = (data?.userChoice ?? "")

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

        if (usernameHash !== roomInformation["users"][username]) {
            throw new Error("Username hash outdated") 
        }

        // interrogated user validation
        const answerCard = await redisClient.json.get(`room:${roomId}:answer`) 

        if (username !== answerCard["user"]) {
            throw new Error("Given user account is not being interrogated currently")
        }

        // user choice validation
        const definitions = answerCard["card"]["definitions"]

        if (!(definitions.includes(userChoice))) {
            apiSocket.to(`room:${roomId}`).emit("choiceValidation", {
                status: "ok",
                result: "wrong",
                userChoice,
                correctAnswer: definitions[0]
            })
        } else {
            apiSocket.to(`room:${roomId}`).emit("choiceValidation", {
                status: "ok",
                result: "correct",
                userChoice
            })
        }

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
