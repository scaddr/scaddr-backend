const { apiSocket } = require("../server.js")

const broadcastConnectedUsers = (roomId, roomData) => {
    apiSocket.to(`room:${roomId}`).emit("joinedUsers", {
        status: "ok",
        users: Object.keys(roomData["users"]),
        leader: roomData["leader"]
    })
}

module.exports = {
    broadcastConnectedUsers
}
