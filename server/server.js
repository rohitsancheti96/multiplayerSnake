const port = process.env.PORT || 3003;

const io = require("socket.io")({
    cors: {
      origin: `https://distracted-ramanujan-70b89a.netlify.app:${port}`,
        // origin: "http://127.0.0.1:5500",
      methods: ["GET", "POST"]
    }
  });

const { gameLoop, getUpdatedVelocity, initGame } = require('./game');
const { FRAME_RATE } = require('./constant');
const { makeid } = require('./util');

const state = {};
const clientRooms = {};

io.on('connection', client => {
    client.on('keydown', handleKeyDown);
    client.on('newGame', handleNewGame);
    client.on('joinGame', handleJoinGame);

    function handleJoinGame(roomName){
        const room = io.sockets.adapter.rooms.get(roomName);
        console.log(room)
        let allUsers;
        if(room){
            allUsers = room.size
        }

        let numClients = 0;
        if(allUsers){
            numClients = allUsers;
        }

        if(numClients === 0){
            client.emit('unknownGame');
            return;
        } else if(numClients > 1){
            client.emit('tooManyPlayers');
            return;
        }

        clientRooms[client.id] = roomName;

        client.join(roomName);
        client.number = 2;
        client.emit('init', 2)
        startGameInterval(roomName);
    }

    function handleNewGame() {
        let roomName = makeid(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName)

        state[roomName] = initGame();

        client.join(roomName);
        client.number = 1;
        client.emit('init', 1);
    }

    function handleKeyDown(keyCode) {
        const roomName = clientRooms[client.id];

        if(!roomName){
            return;
        }

        try{
            keyCode = parseInt(keyCode)
        } catch(e){
            console.log(err);
            return;
        }

    const vel = getUpdatedVelocity(keyCode);

    if(vel){
        state[roomName].players[client.number - 1].vel = vel;
    }

    }
});

function startGameInterval(roomName) {
    const interval = setInterval(() => {
        const winner = gameLoop(state[roomName]);

        if(!winner){
            emitGameState(roomName, state[roomName]);
        } else {
            emitGameOver(roomName, winner);
            state[roomName] = null;
            clearInterval(interval);
        }
    }, 1000 / FRAME_RATE);
}

function emitGameState(roomName, state){
    io.sockets.in(roomName).emit('gameState', JSON.stringify(state));
}

function emitGameOver(roomName, winner){
    io.sockets.in(roomName).emit('gameOver', JSON.stringify({winner}));
}

io.listen(port || 3003);