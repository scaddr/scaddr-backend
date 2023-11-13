const { apiSocket } = require("../server.js")
const redisClient = require("../redis.js")

const broadcastConnectedUsers = (roomId, roomData) => {
    apiSocket.to(`room:${roomId}`).emit("joinedUsers", {
        status: "ok",
        users: Object.keys(roomData["users"]),
        leader: roomData["leader"]
    })
}

const broadcastRoomStatus = async (roomId) => {
    const room = JSON.parse(await redisClient.hGet("rooms", roomId)) 
    apiSocket.to(`room:${roomId}`).emit("gameStatus", {
        status: "ok",
        roomStatus: room["status"]
    })
}

const sendQuestion = async (socket, roomId) => {
    const question = await redisClient.json.get(`room:${roomId}:question`)
    if (question === null) {
        return
    }

    question.status = "ok"
    socket.emit("pokeQuestion", question)
}

module.exports = {
    broadcastConnectedUsers,
    broadcastRoomStatus,
    sendQuestion
}
