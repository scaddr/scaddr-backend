// import server 
const { app, apiSocket } = require("./server.js")
const redisClient = require("./redis.js")

// import endpoints
const disconnect = require("./endpoints/classic/disconnect.js")
const createRoom = require("./endpoints/createRoom.js")
const joinRoom = require("./endpoints/joinRoom.js")
const userVerify = require("./endpoints/userVerify.js")
const startGame = require("./endpoints/startGame.js")

const { pokeAnswer } = require("./endpoints/game.js")

// socket connections
apiSocket.on("connection", (socket) => {
    let socketData = {}

    socket.on("disconnect", async () => await disconnect(socket, socketData))
    socket.on("createRoom", async (data, callback) => await createRoom(data, callback, socket, socketData))
    socket.on("joinRoom", async (data, callback) => await joinRoom(data, callback, socket, socketData))
    socket.on("userVerify", async (data, callback) => await userVerify(data, callback, socket, socketData))
    socket.on("startGame", async (data, callback) => await startGame(data, callback, socket, socketData))

    socket.on("pokeAnswer", async (data, callback) => await pokeAnswer(data, callback, socket, socketData))
})

// socket connections

// express routes
app.get("/", (req, res) => {
    res.send({
        status: "ok"
    })
})
// express routes
