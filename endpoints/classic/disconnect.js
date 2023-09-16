const redisClient = require("../../redis.js")
const { broadcastConnectedUsers } = require("../../functions/socketFunctions.js")

const disconnect = async (socket, socketData) => {
    const roomId = socketData["room"]
    const username = socketData["username"]

    if (roomId == null) {
        return
    }

    const room = JSON.parse(await redisClient.hGet("rooms", roomId))

    delete room["users"][username]

    // re-elect a leader in case the leader left
    if (username === room["leader"]) {
        room["leader"] = Object.keys(room["users"])[0]
    }

    // if there's no users in the room, delete its data
    const numberOfUsers = Object.keys(room["users"]).length
    if (numberOfUsers <= 0) {
        await redisClient.hDel("rooms", roomId)
        await redisClient.del(`room:${roomId}:cards`)
        return
    }

    // update the information in the database
    await redisClient.hSet("rooms", roomId, JSON.stringify(room))

    broadcastConnectedUsers(roomId, room)
}

module.exports = disconnect
