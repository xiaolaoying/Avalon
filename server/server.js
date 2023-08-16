const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const io = socketIo(server);

// 设置静态文件托管
app.use(express.static('public'));

// 当用户访问根URL时，发送index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

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

server.listen(PORT, () => {
    console.log('server started on port ' + PORT);
});
