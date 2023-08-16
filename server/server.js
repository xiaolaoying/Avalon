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

    // 当用户想要加入一个房间时
    socket.on('joinRoom', (roomNumber) => {
        socket.join(roomNumber);
        console.log(`user ${socket.id} joined room: ${roomNumber}`);
    });

    // 当用户想要离开一个房间时
    socket.on('leaveRoom', (roomNumber) => {
        socket.leave(roomNumber);
        console.log(`user ${socket.id} left room: ${roomNumber}`);
    });

    // 当游戏开始事件被触发时，只发送给特定房间的用户
    socket.on('startGame', (roomNumber) => {
        // 这里可以实现发牌等逻辑
        io.to(roomNumber).emit('gameStarted', `Game has started in room: ${roomNumber}!`);
    });
});

server.listen(PORT, () => {
    console.log('server started on port ' + PORT);
});
