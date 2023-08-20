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
            assignedRoles = [r.roleDefs[r.roles.MEILIN], r.roleDefs[r.roles.PAIXI], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.ZHONGCHEN], r.roleDefs[r.roles.MOGANNA], r.roleDefs[r.roles.CIKE], r.roleDefs[r.roles.HEILAODA], r.roleDefs[r.roles.AOBOLUN]]; // 梅林, 派西维尔, 忠臣*4, 莫甘娜, 刺客, 莫德雷德, 奥伯伦
            break;
        default:
            console.error("Unsupported player count.");
    }

    return assignedRoles;
}

function shuffleArray(array) {
    // Fisher-Yates (也称为 Knuth) 算法
    for (let i = array.length - 1; i > 0; i--) {
        // 生成一个随机索引
        const j = Math.floor(Math.random() * (i + 1));

        // 交换元素
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


function getCanSee(canSee, rolesArray) {
    // 根据身份的canSee属性，返回可以看到的玩家的index
    let canSeeArray = [];
    canSee.forEach((roleName) => {
        rolesArray.forEach((role, index) => {
            if (r.roleDefs[roleName] === role) {
                canSeeArray.push(index);
            }
        });
    });
    return canSeeArray.sort((a, b) => a - b); // 必须将看到的玩家按照index排序
}

// 储存每个房间的队伍名单
const teamMembers = {};
// 添加一个对象来跟踪每个房间的投票状态
const openVotes = {};
// 储存秘密投票的数据结构
const secretVotes = {};

function notifyTeamMembersForSecretVote(roomNumber) {
    const playersInRoom = rooms[roomNumber];

    // 为每一个在队伍中的玩家发送通知
    teamMembers[roomNumber].forEach(playerName => {
        const player = playersInRoom.find(p => p.name === playerName);
        if (player) {
            io.to(player.id).emit('beginSecretVote');
        }
    });
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

    // 当用户想要离开一个房间时
    socket.on('leaveRoom', (roomNumber, playerName) => {
        // 查找玩家在房间中的索引
        const playerIndex = rooms[roomNumber].findIndex(player => player.name === playerName);

        // 如果玩家存在于房间中，移除他
        if (playerIndex > -1) {
            rooms[roomNumber].splice(playerIndex, 1);
        }

        // 从房间数据中提取玩家名称列表，以便发送给客户端
        const playerNames = rooms[roomNumber].map(player => player.name);

        // 广播更新后的玩家列表
        io.to(roomNumber).emit('updatePlayers', playerNames);

        // 让该玩家离开这个socket房间
        socket.leave(roomNumber);
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
            io.to(player.id).emit('receiveRole', role.name, role.canSeeDesc, getCanSee(role.canSee, shuffledRoles).map(index => players[index].name));
        });

        io.to(roomNumber).emit('gameStarted');
    });

    // 当队长选择了他的团队
    socket.on('teamSelected', (selectedTeam) => {
        // console.log(selectedTeam);
        // 获取队长所在的房间
        let roomNumber;
        for (const room in rooms) {
            if (rooms[room].find(player => player.id === socket.id)) {
                roomNumber = room;
                break;
            }
        }

        if (!roomNumber) return; // 如果找不到房间，什么都不做

        // 储存队伍名单
        teamMembers[roomNumber] = selectedTeam;

        // 向该房间的所有玩家广播队伍名单
        io.to(roomNumber).emit('teamAnnounced', selectedTeam);

        // 此时，客户端应当为每个玩家显示赞成和反对的按钮来表决
    });

    socket.on('openVote', (voteChoice) => {
        // 获取玩家所在的房间
        let roomNumber;
        let playerName;
        for (const room in rooms) {
            const player = rooms[room].find(player => player.id === socket.id);
            if (player) {
                roomNumber = room;
                playerName = player.name;
                break;
            }
        }

        if (!roomNumber) return;

        // 初始化这个房间的投票计数（如果还没初始化过）
        if (!openVotes[roomNumber]) {
            openVotes[roomNumber] = {
                approve: 0,
                oppose: 0,
                totalVotes: 0,
                approveNames: [],
                opposeNames: []
            };
        }

        // 计数玩家的投票
        openVotes[roomNumber][voteChoice]++;
        openVotes[roomNumber].totalVotes++;

        // 记录投票的玩家的名字
        if (voteChoice === 'approve') {
            openVotes[roomNumber].approveNames.push(playerName);
        } else {
            openVotes[roomNumber].opposeNames.push(playerName);
        }

        // 如果所有玩家都已经投票
        if (openVotes[roomNumber].totalVotes === rooms[roomNumber].length) {
            let resultMessage = '';
            if (openVotes[roomNumber].approve > openVotes[roomNumber].oppose) {
                resultMessage = `赞成票超过半数，队伍出征`;
            } else {
                resultMessage = '赞成票未超过半数，队伍不出征';
            }

            const detailedResult = {
                message: resultMessage,
                approveNames: openVotes[roomNumber].approveNames,
                opposeNames: openVotes[roomNumber].opposeNames
            };

            io.to(roomNumber).emit('voteResult', detailedResult);

            if (openVotes[roomNumber].approve > openVotes[roomNumber].oppose) {
                // 初始化房间的秘密投票数据
                secretVotes[roomNumber] = {
                    totalVotes: 0,
                    success: 0,
                    fail: 0,
                    // 不储存每个玩家的具体选择，确保投票的秘密性
                };

                notifyTeamMembersForSecretVote(roomNumber);

                // teamMembers[roomNumber].forEach(playerId => {
                //     io.to(playerId).emit('beginSecretVote');
                // });

            }

            // 清除这个房间的投票记录，为下次投票做准备
            delete openVotes[roomNumber];
        }
    });

    socket.on('submitSecretVote', (roomNumber, vote) => {
        secretVotes[roomNumber].totalVotes++;
        if (vote === 'success') {
            secretVotes[roomNumber].success++;
        } else if (vote === 'fail') {
            secretVotes[roomNumber].fail++;
        }

        // 如果所有玩家都已经投票
        if (secretVotes[roomNumber].totalVotes === teamMembers[roomNumber].length) {
            let voteOutcome = '有' + secretVotes[roomNumber].fail + '个人投了任务失败';
            io.to(roomNumber).emit('secretVoteResult', voteOutcome);

            // 清除这个房间的秘密投票记录
            delete secretVotes[roomNumber];
        }
    });
});

server.listen(PORT, () => {
    console.log('server started on port ' + PORT);
});
