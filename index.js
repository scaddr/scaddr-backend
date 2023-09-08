const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const { createServer } = require("http")
const { Server } = require("socket.io")
const { createClient } = require("redis")
const { v4: uuidv4 } = require("uuid")
const CSV = require("csv-string")

// crypto setup 
const passwordGenerator = require("generate-password")
const { createHash } = require("node:crypto") 
// crypto setup 

// redis setup 
const redisLocation = process.env.REDIS; 
const redisClient = createClient(redisLocation);

redisClient.on("error", err => {
    console.log("Redis Client Error", err);
});

// redis connect
(async () => {
    await redisClient.connect();
    if (!redisClient.isOpen) {
        console.error(`Cannot establish a client connection with the Redis server: ${redisLocation}`)
        process.exit();
    } 

    console.log("Successfully established a client connection with the Redis server");
})();
// redis setup

// socket.io & express setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

const httpServer = createServer(app);
const socketPort = 3001;
const apiSocket = new Server(httpServer, {
    cors: {
        origin: "http://localhost:8080",
        methods: ["GET", "POST"]
    }
});
// socket.io & express setup 

// socket connections
apiSocket.on("connection", (socket) => {
    let socketData = {}

    const broadcastConnectedUsers = (roomId, roomData) => {
        apiSocket.to(`room:${roomId}`).emit("joinedUsers", {
            status: "ok",
            users: Object.keys(roomData["users"]),
            leader: roomData["leader"]
        })
    } 

    socket.on("disconnect", async () => {
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
    })

    socket.on("createRoom", async (data, callback) => {
        try {
            const newRoomId = uuidv4().toString()
            const username = (data?.username ?? "").trim()
            const flashcardsFile = data?.cardsFile?.contents ?? ""
            
            if (username == "" || username == "system") {
                throw new Error("Invalid username submitted")
            }

            if (flashcardsFile == "") {
                throw new Error("No flashcards file submitted")
            }

            const usernamePassword = passwordGenerator.generate({
                length: 100,
                numbers: true,
                symbols: true,
                lowercase: true,
                uppercase: true
            })

            const sha512 = createHash("sha512")
            sha512.update(`${username}:${usernamePassword}`)
            const usernameHash = sha512.digest("hex");

            const newRoom = {
                id: newRoomId, 
                leader: username,
                status: "lobby",
                users: {
                    [username]: usernameHash
                }
            }

            await redisClient.hSet("rooms", newRoomId, JSON.stringify(newRoom));

            const parsedFlashcards = CSV.parse(flashcardsFile)

            // TODO: CSV columns are fetched in a "static" manner. Let's fix that in the future possibly
            parsedFlashcards.forEach(async (flashcard) => {
                if (flashcard.length != 3) {
                    return;
                }

                const flashcardObject = {
                    "foreignWord": flashcard[0],
                    "wordReading": flashcard[1],
                    "definitions": flashcard[2].split(" | ")
                }

                await redisClient.lPush(`room:${newRoomId}:cards`, JSON.stringify(flashcardObject))
            })

            socketData["username"] = username;
            socketData["room"] = newRoomId;

            socket.join(`room:${newRoomId}`)

            // send user update information to all the clients 
            broadcastConnectedUsers(newRoomId, newRoom)
            
            // send room state to this socket 
            socket.emit("gameStatus", {
                status: "ok",
                roomStatus: newRoom["status"]
            })

            callback({
                status: "ok",
                username,
                usernameHash,
                roomId: newRoomId,
            })
        } 
        catch (e) {
            console.error(e)
            callback({
                status: "failed"
           })
        }
    })

    socket.on("joinRoom", async (data, callback) => {
        try {
            const roomId = data?.roomId ?? ""
            const username = (data?.username ?? "").trim()
            
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
                    [username]: usernameHash
                }
            }

            await redisClient.hSet("rooms", roomId, JSON.stringify(updatedRoom));

            socketData["username"] = username;
            socketData["room"] = roomId;

            socket.join(`room:${roomId}`)

            // send user update information to all the clients 
            broadcastConnectedUsers(roomId, updatedRoom)

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
    })

    socket.on("userVerify", async (data, callback) => {
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

            if (usernameHash !== roomInformation["users"][username]) {
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
    })

    socket.on("startGame", async (data, callback) => {
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

            callback({
                status: "ok"
            })
        } catch (e) {
            callback({
                status: "failed",
                reason: e.toString()
            })
        }
    })
})

// socket connections

// express routes
app.get("/", (req, res) => {
    res.send({
        status: "ok"
    })
})
// express routes

// express listen
httpServer.listen(socketPort);
// express listen
