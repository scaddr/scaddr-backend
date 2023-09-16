const { apiSocket } = require("../server.js")
const redisClient = require("../redis.js")

const electUser = (roomId) => {
    console.log(`Electing user for room: ${roomId}`)
    return "yes" // TODO
}

const startGame = async (data, callback, socket, socketData) => {
    try {
        const roomId = data?.roomId ?? ""
        const username = (data?.username ?? "").trim()
        const usernameHash = (data?.usernameHash ?? "").trim()

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

        if (usernameHash !== room["users"][username]) {
            throw new Error("Failed to authenticate with given user/userhash")
        }

        if (username !== room["leader"]) {
            throw new Error("Cannot start game - user is not leader")
        }

        const updatedRoom = {
            ...room,
            status: "game"
        } 

        await redisClient.hSet("rooms", roomId, JSON.stringify(updatedRoom))

        // broadcast change to players 
        apiSocket.to(`room:${roomId}`).emit("gameStatus", {
            status: "ok",
            roomStatus: updatedRoom["status"]
        })

        // user election
        const electedUser = electUser(roomId)

        callback({
            status: "ok"
        })
    } catch (e) {
        callback({
            status: "failed",
            reason: e.toString()
        })
    }
}

module.exports = startGame;
