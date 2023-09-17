const { apiSocket } = require("../server.js")
const redisClient = require("../redis.js")

const broadcastConnectedUsers = (roomId, roomData) => {
    apiSocket.to(`room:${roomId}`).emit("joinedUsers", {
        status: "ok",
        users: Object.keys(roomData["users"]),
        leader: roomData["leader"]
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
    sendQuestion
}
