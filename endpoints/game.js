const pokeAnswer = async (data, callback, socket, socketData) => {
    try {
        const roomId = data?.roomId ?? ""
        const username = (data?.username ?? "").trim()

        if (roomId == "") {
            throw new Error("Invalid room ID submitted")
        }

        if (username == "" || username == "system") {
            throw new Error("Invalid username submitted")
        }
    } catch (e) {
        console.error(e)
        callback({

        })
    }
}

module.exports = {
    pokeAnswer
}
