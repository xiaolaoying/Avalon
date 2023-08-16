const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const r = require('./roles');

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

let rooms = {}; // { 'roomNumber': ['player1', 'player2', ...], ... }

const MIN_PLAYERS = 5;

function getRolesByPlayerCount(playerCount) {
    let assignedRoles = [];

    switch (playerCount) {
        case 5:
            assignedRoles = [r.roleDefs[r.roles.MEILIN], r.roleDefs[r.roles.PAIXI], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.MOGANNA], r.roleDefs[r.roles.CIKE]]; // 梅林, 派西维尔, 忠臣, 莫甘娜, 刺客
            break;
        case 6:
            assignedRoles = [r.roleDefs[r.roles.MEILIN], r.roleDefs[r.roles.PAIXI], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.MOGANNA], r.roleDefs[r.roles.CIKE]]; // 梅林, 派西维尔, 忠臣*2, 莫甘娜, 刺客
            break;
        case 7:
            assignedRoles = [r.roleDefs[r.roles.MEILIN], r.roleDefs[r.roles.PAIXI], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.MOGANNA], r.roleDefs[r.roles.CIKE], r.roleDefs[r.roles.AOBOLUN]]; // 梅林, 派西维尔, 忠臣*2, 莫甘娜, 刺客, 奥伯伦
            break;
        case 8:
            assignedRoles = [r.roleDefs[r.roles.MEILIN], r.roleDefs[r.roles.PAIXI], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.MOGANNA], r.roleDefs[r.roles.CIKE], r.roleDefs[r.roles.ZHAOYA]]; // 梅林, 派西维尔, 忠臣*3, 莫甘娜, 刺客, 爪牙
            break;
        case 9:
            assignedRoles = [r.roleDefs[r.roles.MEILIN], r.roleDefs[r.roles.PAIXI], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.MOGANNA], r.roleDefs[r.roles.CIKE], r.roleDefs[r.roles.HEILAODA]]; // 梅林, 派西维尔, 忠臣*4, 莫甘娜, 刺客, 莫德雷德
            break;
        case 10:
            assignedRoles = [r.roleDefs[r.roles.MEILIN], r.roleDefs[r.roles.PAIXI], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.MOGANNA], r.roleDefs[r.roles.CIKE], r.roleDefs[r.roles.HEILAODA], r.roleDefs[r.roles.AOBOLUN]]; // 梅林, 派西维尔, 忠臣*3, 莫甘娜, 刺客, 爪牙
            break;
        default:
            console.error("Unsupported player count.");
    }

    return assignedRoles;
}

function shuffleArray(array) {
    // 随机排序数组的函数，可以使用Fisher-Yates算法
    return array;
}

function getCanSee(canSee, rolesArray) {
    // 根据身份的canSee属性，返回可以看到的玩家的index
    let canSeeArray = [];
    canSee.forEach((roleName) => {
        rolesArray.forEach((role, index) => {
            if (r.roleDefs[roleName] === role) {
                canSeeArray.push(role, index);
            }
        });
    });
    return canSeeArray;
}

io.on('connection', (socket) => {
    console.log('a user connected');

    // 当用户想要加入一个房间时
    socket.on('joinRoom', (roomNumber, playerName) => {
        socket.join(roomNumber);
    
        // 如果房间不存在，先创建它
        if (!rooms[roomNumber]) {
            rooms[roomNumber] = [];
        }
    
        // 向房间数组中添加一个包含玩家名称和socket.id的对象
        rooms[roomNumber].push({
            name: playerName,
            id: socket.id
        });
    
        // 从房间数据中提取玩家名称列表，以便发送给客户端
        const playerNames = rooms[roomNumber].map(player => player.name);
    
        // 通知房间内的所有玩家
        io.to(roomNumber).emit('updatePlayers', playerNames);
    });
    

    // 你还可以添加离开房间、断开连接等逻辑...

    // 当用户想要离开一个房间时
    socket.on('leaveRoom', (roomNumber) => {
        socket.leave(roomNumber);
        console.log(`user ${socket.id} left room: ${roomNumber}`);
    });

    // 当游戏开始事件被触发时，只发送给特定房间的用户
    socket.on('startGame', (roomNumber) => {
        const players = rooms[roomNumber];
        
        if (!players || players.length < MIN_PLAYERS) {
            socket.emit('error', '玩家数量不足');
            return;
        }

        const shuffledRoles = shuffleArray(getRolesByPlayerCount(players.length)); // 对身份进行随机排序

        players.forEach((player, index) => {
            const role = shuffledRoles[index];
            io.to(player.id).emit('receiveRole', role.name, role.canSeeDesc, getCanSee(role.canSee, shuffledRoles));
        });

        io.to(roomNumber).emit('gameStarted');
    });
});

server.listen(PORT, () => {
    console.log('server started on port ' + PORT);
});
