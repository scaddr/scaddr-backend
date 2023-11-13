const { apiSocket } = require("../server.js")
const redisClient = require("../redis.js")

const { pokeQuestion } = require("../functions/gameplayFunctions.js")
const { broadcastRoomStatus } = require("../functions/socketFunctions.js")


const startGame = async (data, callback, socket, socketData) => {
    try {
        const roomId = typeof data?.roomId === "string" ? (data.roomId).trim() : ""
        const username = typeof data?.username === "string" ? (data.username).trim() : ""
        const usernameHash = typeof data?.usernameHash === "string" ? (data.usernameHash).trim() : ""

        if (roomId == "") {
            throw new Error("Invalid room ID submitted")
        }

        if (username == "" || username == "system") {
            throw new Error("Invalid username submitted")
        }

        if (usernameHash == "") {
            throw new Error("Invalid userhash submitted")
        }

        const room = JSON.parse(await redisClient.hGet("rooms", roomId))

        if (!(username in room["users"])) {
            throw new Error("Given username not found")
        }

        if (usernameHash !== room["users"][username]["usernameHash"]) {
            throw new Error("Failed to authenticate with given user/userhash")
        }

        if (username !== room["leader"]) {
            throw new Error("Cannot start game - user is not leader")
        }

        const updatedRoom = room; 
        updatedRoom["status"]["state"] = "game"

        await redisClient.hSet("rooms", roomId, JSON.stringify(updatedRoom))

        // broadcast change to players 
        await broadcastRoomStatus(roomId);

        callback({
            status: "ok",
            level: "startGame"
        })

        // poke question
        console.log(`Poking question inside room ${roomId}`)
        pokeQuestion(roomId)
    } catch (e) {
        callback({
            status: "failed",
            level: "startGame",
            reason: e.toString()
        })
    }
}

module.exports = startGame;
