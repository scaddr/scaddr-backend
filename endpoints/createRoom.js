const { v4: uuidv4 } = require("uuid")
const CSV = require("csv-string")
const passwordGenerator = require("generate-password")
const { createHash } = require("node:crypto") 
const redisClient = require("../redis.js")

// functions
const { broadcastConnectedUsers } = require("../functions/socketFunctions.js")

const createRoom = async (data, callback, socket, socketData) => {
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
}

module.exports = createRoom
