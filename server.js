const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const { createServer } = require("http")
const { Server } = require("socket.io")

const app = express()
app.use(cors())
app.use(bodyParser.json())

const httpServer = createServer(app)
const serverPort = 3001
const apiSocket = new Server(httpServer, {
    cors: {
        origin: "http://localhost:8080",
        methods: ["GET", "POST"]
    }
})

httpServer.listen(serverPort)

module.exports = {
    app,
    httpServer,
    serverPort, 
    apiSocket
}

