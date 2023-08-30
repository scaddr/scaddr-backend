const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const { createServer } = require("http")
const { Server } = require("socket.io")
const { createClient } = require("redis")
const { v4: uuidv4 } = require("uuid")

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
// socket connections

// express routes
app.get("/", (req, res) => {
    res.send({
        status: "ok"
    })
})

app.post("/createRoom", async (req, res) => {
    try {
        const newRoomId = uuidv4().toString()
        const username = (req.body?.username ?? "").trim()
        const flashcardsFile = req.body?.cardsFile?.contents ?? ""
        
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
            owner: username,
            status: "lobby",
            users: {
                [username]: usernameHash
            }
        }

        // const room = JSON.parse(await redisClient.hGet("firecard_rooms", roomId));

        await redisClient.hSet("rooms", newRoomId, JSON.stringify(newRoom));

        // await redisClient.hSet(`room:${roomId}:users`, username, newClientToken);
        res.send({
            status: "ok",
            username,
            usernameHash
        })
        return;
    } 
    catch (e) {
        console.error(e);
        res.send({ 
            status: "fail",
            message: "Failed joining the room. Please contact the server admin."
        });
        return;
    }
})
// express routes

// express listen
httpServer.listen(socketPort);
// express listen
