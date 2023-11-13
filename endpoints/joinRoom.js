const passwordGenerator = require("generate-password")
const { createHash } = require("node:crypto")
const redisClient = require("../redis.js")

// functions
const { broadcastConnectedUsers, sendQuestion } = require("../functions/socketFunctions.js")

const joinRoom = async (data, callback, socket, socketData) => {
    try {
        const roomId = typeof data?.roomId === "string" ? (data.roomId).trim() : ""
        const username = typeof data?.username === "string" ? (data.username).trim() : ""
        
        if (roomId == "") {
            throw new Error("Invalid room ID submitted")
        }

        if (username == "" || username == "system") {
            throw new Error("Invalid username submitted")
        }

        const usernamePassword = passwordGenerator.generate({
            length: 100,
            symbols: true,
            numbers: true,
            lowercase: true,
            uppercase: true
        })

        const sha512 = createHash("sha512")
        sha512.update(`${username}:${usernamePassword}`)
        const usernameHash = sha512.digest("hex")

        const room = JSON.parse(await redisClient.hGet("rooms", roomId))

        // check if username already exists in room 
        if (username in room["users"]) {
            throw new Error("Username already in use")
        }

        const updatedRoom = {
            ...room,
            "users": {
                ...room.users,
                [username]: {
                    correct: 0,
                    wrong: 0,
                    usernameHash
                }
            }
        }

        await redisClient.hSet("rooms", roomId, JSON.stringify(updatedRoom));

        // save socket data to identify the client in anonymous socket endpoints (i.e. disconnect)
        socketData["username"] = username;
        socketData["room"] = roomId;

        socket.join(`room:${roomId}`)

        // send user update information to all the clients 
        broadcastConnectedUsers(roomId, updatedRoom)

        // send the ongoing question to the connected client
        sendQuestion(socket, roomId)

        // send room state to this socket 
        socket.emit("gameStatus", {
            status: "ok",
            roomStatus: updatedRoom["status"]
        })

        callback({
            status: "ok",
            username,
            usernameHash,
            roomId,
        })
    } 
    catch (e) {
        console.error(e)
        callback({
            status: "failed"
       })
    }
}

module.exports = joinRoom
