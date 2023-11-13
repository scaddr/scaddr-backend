const redisClient = require("../redis.js")

const userVerify = async (data, callback, socket, socketData) => {
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
            throw new Error("Invalid usernameHash submitted")
        }

        const roomInformation = JSON.parse(await redisClient.hGet("rooms", roomId))

        if (!(username in roomInformation["users"])) {
            throw new Error("Username does not exist in this room")
        }

        if (usernameHash !== roomInformation["users"][username]["usernameHash"]) {
            throw new Error("Username hash outdated") 
        }

        socket.join(`room:${roomId}`)

        callback({
            status: "ok"
        })
    } 
    catch (e) {
        callback({
            status: "failed",
            reason: e.toString()
        })
    }
}

module.exports = userVerify
