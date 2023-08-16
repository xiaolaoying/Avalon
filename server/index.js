const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('joinRoom', (roomName) => {
        socket.join(roomName);
        console.log('user joined room: ' + roomName);
    });

    socket.on('startGame', () => {
        // 这里可以实现发牌等逻辑
        io.to('roomName').emit('gameStarted', 'Game has started!');
    });
});

server.listen(3000, () => {
    console.log('server started on port 3000');
});
