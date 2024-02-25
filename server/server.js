const express = require('express');
// const cors = require('cors');
const http = require('http');
const r = require('./roles');
const session = require("express-session");
const { v4: uuidv4 } = require('uuid');
const { del } = require('selenium-webdriver/http');

const app = express();
// app.use(cors());
const PORT = 3000;
const server = http.createServer(app);

const sessionMiddleware = session({
    secret: "smart-wht",
    resave: false, // 推荐设置为false，除非有特定需求
    saveUninitialized: false, // 推荐设置为false，以避免存储大量无用的session
    cookie: {
        maxAge: 3600000, // 设置cookie的过期时间为1小时
    },
});

const io = require('socket.io')(server, {
    allowRequest: (req, callback) => {
        // with HTTP long-polling, we have access to the HTTP response here, but this is not
        // the case with WebSocket, so we provide a dummy response object
        const fakeRes = {
            getHeader() {
                return [];
            },
            setHeader(key, values) {
                req.cookieHolder = values[0];
            },
            writeHead() { },
        };
        sessionMiddleware(req, fakeRes, () => {
            if (req.session) {
                // trigger the setHeader() above
                fakeRes.writeHead();
                // manually save the session (normally triggered by res.end())
                req.session.save();
            }
            callback(null, true);
        });
    },
    // cors: {
    //     // 不用加吧
    //     // origin: "https://zlzai.xyz",
    //     methods: ["GET", "POST"]
    // }
});

// 设置静态文件托管
app.use(express.static('public'));

// 当用户访问根URL时，发送index.html
// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/public/index.html');
// });


// { 'roomNumber': {
// players: ['player1', 'player2', ...],
// roomStatus: ROOM_WAIT ...
// }, ... }
let rooms = {};

// { 'session.userId': { 'roomNumber': ... }, ... }
let sessionTrack = {};

const ROOM_WAIT = 0; // 游戏还没有开始
const ROOM_SPEAK = 1; // 发言阶段
const ROOM_VOTE = 2; // 投票开车阶段
const ROOM_TASK = 3; // 发车成功，做任务阶段

// 储存每个房间的队伍名单
const teamMembers = {};
// 添加一个对象来跟踪每个房间的投票状态
const openVotes = {};
// 储存秘密投票的数据结构
const secretVotes = {};
const secretVotedPlayers = {};

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

function getNeedPlayerAndfaultTolerant(round, playerNum) {
    const taskPlayer5 = [0, 2, 3, 2, 3, 3]
    const taskPlayer6 = [0, 2, 3, 4, 3, 4]
    const taskPlayer7 = [0, 2, 3, 3, 4, 4]
    const taskPlayer8 = [0, 3, 4, 4, 5, 5]
    const fault5 = [false, false, false, false, false, false]
    const fault6 = [false, false, false, false, false, false]
    const fault7 = [false, false, false, false, true, false]
    const fault8 = [false, false, false, false, true, false]

    switch (playerNum) {
        case 5:
            return [taskPlayer5[round], fault5[round]];
        case 6:
            return [taskPlayer6[round], fault6[round]];
        case 7:
            return [taskPlayer7[round], fault7[round]];
        case 8:
        case 9:
        case 10:
            return [taskPlayer8[round], fault8[round]];
        default:
            console.error("Unsupported player count.");
    }
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

io.engine.on("initial_headers", (headers, req) => {
    if (req.cookieHolder) {
        headers["set-cookie"] = req.cookieHolder;
        delete req.cookieHolder;
    }
});

io.on('connection', (socket) => {
    const req = socket.request;
    console.log(`${socket.id} connected, sessionId=${req.session.userId}`)
    if (req.session.userId != null) {
        let track = sessionTrack[req.session.userId];
        if (track != null) {
            const roomNumber = track['roomNumber'];
            const room = rooms[roomNumber];
            var playerIndex = -1;
            if (room) {
                // 查找玩家在房间中的索引
                playerIndex = rooms[roomNumber].players.findIndex(player => player.session === req.session.userId);
            }

            // 如果玩家存在于房间中，说明该玩家为重连，将他标记为在线
            if (playerIndex > -1) {
                room.players[playerIndex].online = true;
                room.players[playerIndex].id = socket.id;
                const player = room.players[playerIndex];
                const playerNames = room.players.map(player => player.name);
                var canSecretVote = false;
                if (teamMembers[roomNumber]) {
                    if (teamMembers[roomNumber].find(playerName => player.name === playerName)) {
                        canSecretVote = true;
                    }
                }
                var reconnectArgs = {
                    players: playerNames,
                    selectedTeam: teamMembers[roomNumber],
                    detailedResult: room.detailedResult,
                    canSecretVote: canSecretVote,
                    role: player.role
                }
                socket.join(roomNumber);
                io.to(socket.id).emit('reconnect', room.roomStatus, player.name, roomNumber, reconnectArgs);
            }
        }
    }

    socket.use((__, next) => {
        req.session.reload((err) => {
            if (err) {
                socket.disconnect();
            } else {
                if (req.session.userId == null) {
                    req.session.userId = uuidv4();
                    req.session.save();
                }
                next();
            }
        });
    });

    function eventToRoom(roomNumber, eventName, ...args) {
        io.to(roomNumber).emit(eventName, ...args);
        rooms[roomNumber].players.forEach((player, index) => {
        })
    }

    function eventToPlayer(player, eventName, ...args) {
        io.to(player.id).emit(eventName, ...args);
    }

    // 当用户想要加入一个房间时
    socket.on('joinRoom', (roomNumber, playerName) => {
        console.log(`${req.session.userId} join room`);
        socket.join(roomNumber);

        // 如果房间不存在，先创建它
        if (!rooms[roomNumber]) {
            rooms[roomNumber] = {
                players: [],
                roomStatus: ROOM_WAIT,
                round: 0,
                voteHistory: []
            };
        }

        // 检查是否已有相同名称的玩家
        const existingPlayer = rooms[roomNumber].players.find(player => player.name === playerName);

        if (existingPlayer) {
            // 如果存在重名玩家，发送一个错误消息给试图加入的玩家
            socket.emit('error', '玩家名称已被使用，请选择另一个名称！');
            return; // 退出，不让玩家加入
        }

        // 如果没有重名玩家，将玩家加入房间
        rooms[roomNumber].players.push({
            name: playerName,
            id: socket.id,
            session: req.session.userId,
            online: true
        });

        sessionTrack[req.session.userId] = {
            'roomNumber': roomNumber,
            'historyEvent': [],
            'metaEvent': []
        }

        // 从房间数据中提取玩家名称列表，以便发送给客户端
        const playerNames = rooms[roomNumber].players.map(player => player.name);

        // 通知房间内的所有玩家
        eventToRoom(roomNumber, 'updatePlayers', playerNames)
        // io.to(roomNumber).emit('updatePlayers', playerNames);
    });


    // 当用户想要离开一个房间时
    socket.on('leaveRoom', (roomNumber, playerName) => {
        console.log(`${req.session.userId} leave room`);
        // 查找玩家在房间中的索引
        const playerIndex = rooms[roomNumber].players.findIndex(player => player.name === playerName);

        // 如果玩家存在于房间中，移除他
        if (playerIndex > -1) {
            rooms[roomNumber].players.splice(playerIndex, 1);
        }

        // 从房间数据中提取玩家名称列表，以便发送给客户端
        const playerNames = rooms[roomNumber].players.map(player => player.name);

        // 让该玩家离开这个socket房间
        socket.leave(roomNumber);

        delete sessionTrack[req.session.userId]

        // 广播更新后的玩家列表
        eventToRoom(roomNumber, 'updatePlayers', playerNames)
        // io.to(roomNumber).emit('updatePlayers', playerNames);
    });


    // 当游戏开始事件被触发时，只发送给特定房间的用户
    socket.on('startGame', (roomNumber) => {
        console.log(`${req.session.userId} start game`);
        const room = rooms[roomNumber];
        const players = rooms[roomNumber].players;

        if (!players || players.length < MIN_PLAYERS) {
            socket.emit('error', '玩家数量不足');
            return;
        }

        const shuffledRoles = shuffleArray(getRolesByPlayerCount(players.length)); // 对身份进行随机排序
        rooms[roomNumber].roomStatus = ROOM_SPEAK;
        players.forEach((player, index) => {
            const role = shuffledRoles[index];
            eventToPlayer(player, 'receiveRole', role.name, role.canSeeDesc, getCanSee(role.canSee, shuffledRoles).map(index => players[index].name))
            player.role = {
                roleName: role.name,
                canSeeDesc: role.canSeeDesc,
                canSeeRoles: getCanSee(role.canSee, shuffledRoles).map(index => players[index].name)
            }
            // io.to(player.id).emit('receiveRole', role.name, role.canSeeDesc, getCanSee(role.canSee, shuffledRoles).map(index => players[index].name));
        });

        room.round = 1;
        room.voteHistory.length = 0;

        eventToRoom(roomNumber, 'gameStarted')
        // io.to(roomNumber).emit('gameStarted');
    });

    // 当队长选择了他的团队
    socket.on('teamSelected', (selectedTeam) => {
        console.log(`${req.session.userId} select team ${selectedTeam}`);
        // 获取队长所在的房间
        let roomNumber;
        for (const room in rooms) {
            if (rooms[room].players.find(player => player.id === socket.id)) {
                roomNumber = room;
                break;
            }
        }

        if (!roomNumber) return; // 如果找不到房间，什么都不做

        // 储存队伍名单
        teamMembers[roomNumber] = selectedTeam;

        rooms[roomNumber].roomStatus = ROOM_VOTE;
        // 向该房间的所有玩家广播队伍名单
        eventToRoom(roomNumber, 'teamAnnounced', selectedTeam)
        // io.to(roomNumber).emit('teamAnnounced', selectedTeam);

        // 此时，客户端应当为每个玩家显示赞成和反对的按钮来表决
    });

    socket.on('openVote', (voteChoice) => {
        console.log(`${req.session.userId} vete ${voteChoice}`);
        // 获取玩家所在的房间
        let roomNumber;
        let playerName;
        for (const room in rooms) {
            const player = rooms[room].players.find(player => player.session === req.session.userId);
            if (player) {
                roomNumber = room;
                playerName = player.name;
                break;
            }
        }

        if (!roomNumber) return;

        const room = rooms[roomNumber];

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

        if (!openVotes[roomNumber].approveNames.find(name => name === playerName) && !openVotes[roomNumber].opposeNames.find(name => name === playerName)) {
            // 计数玩家的投票
            openVotes[roomNumber][voteChoice]++;
            openVotes[roomNumber].totalVotes++;

            // 记录投票的玩家的名字
            if (voteChoice === 'approve') {
                openVotes[roomNumber].approveNames.push(playerName);
            } else {
                openVotes[roomNumber].opposeNames.push(playerName);
            }
        }

        // 如果所有玩家都已经投票
        if (openVotes[roomNumber].totalVotes === rooms[roomNumber].players.length) {
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
            rooms[roomNumber].detailedResult = detailedResult;
            eventToRoom(roomNumber, 'voteResult', detailedResult)
            //io.to(roomNumber).emit('voteResult', detailedResult);

            if (room.voteHistory.length < room.round) {
                room.voteHistory.push({
                    round: room.round,
                    tasks: []
                });
            }

            let currTasks = room.voteHistory[room.voteHistory.length - 1].tasks;
            let term = currTasks.length + 1;
            currTasks.push({
                term: term,
                taskPlayers: teamMembers[roomNumber],
                approvePlayers: openVotes[roomNumber].approveNames,
                againstPlayers: openVotes[roomNumber].opposeNames,
                failedNum: -1,
                taskFailed: false
            });

            if (openVotes[roomNumber].approve > openVotes[roomNumber].oppose) {
                // 初始化房间的秘密投票数据
                secretVotes[roomNumber] = {
                    totalVotes: 0,
                    success: 0,
                    fail: 0,
                    // 不储存每个玩家的具体选择，确保投票的秘密性
                };
                rooms[roomNumber].roomStatus = ROOM_TASK;
                notifyTeamMembersForSecretVote(roomNumber);
            }
            else {
                eventToRoom(roomNumber, 'nextOpenVote')
                // io.to(roomNumber).emit('nextOpenVote');
            }

            // 清除这个房间的投票记录，为下次投票做准备
            delete openVotes[roomNumber];
        }
    });

    function notifyTeamMembersForSecretVote(roomNumber) {
        const playersInRoom = rooms[roomNumber].players;

        // 为每一个在队伍中的玩家发送通知
        teamMembers[roomNumber].forEach(playerName => {
            const player = playersInRoom.find(p => p.name === playerName);
            if (player) {
                eventToPlayer(player, 'beginSecretVote')
                // io.to(player.id).emit('beginSecretVote');
            }
        });
    }

    socket.on('submitSecretVote', (roomNumber, vote) => {
        console.log(`${req.session.userId} submit secret vote, room=${roomNumber}, vote=${vote}`);
        if (!secretVotedPlayers[roomNumber]) {
            secretVotedPlayers[roomNumber] = [];
        }
        if (!secretVotedPlayers[roomNumber].find(playerSession => playerSession === req.session.userId)) {
            secretVotes[roomNumber].totalVotes++;
            if (vote === 'success') {
                secretVotes[roomNumber].success++;
            } else if (vote === 'fail') {
                secretVotes[roomNumber].fail++;
            }
            secretVotedPlayers[roomNumber].push(req.session.userId);
        }

        const room = rooms[roomNumber];
        // 如果所有玩家都已经投票
        if (secretVotes[roomNumber].totalVotes === teamMembers[roomNumber].length) {
            let voteOutcome = '有' + secretVotes[roomNumber].fail + '个人投了任务失败';
            eventToRoom(roomNumber, 'secretVoteResult', voteOutcome)
            // io.to(roomNumber).emit('secretVoteResult', voteOutcome);

            let currTasks = room.voteHistory[room.voteHistory.length - 1].tasks;
            currTasks[currTasks.length - 1].failedNum = secretVotes[roomNumber].fail;
            let [taskNeedPlayerNum, faultTolerant] = getNeedPlayerAndfaultTolerant(room.round, room.players.length);
            if (faultTolerant && secretVotes[roomNumber].fail <= 1) {
                currTasks[currTasks.length - 1].taskFailed = false;
            } else if (secretVotes[roomNumber].fail === 0) {
                currTasks[currTasks.length - 1].taskFailed = false;
            } else {
                currTasks[currTasks.length - 1].taskFailed = true;
            }
            room.round++;

            // 清除这个房间的秘密投票记录
            delete secretVotes[roomNumber];
            rooms[roomNumber].roomStatus = ROOM_SPEAK;
            delete secretVotedPlayers[roomNumber];
        }
    });

    socket.on("getVoteHistory", (cb) => {
        console.log(`${req.session.userId} get vote history`);
        var roomNumber = null;
        try {
            roomNumber = sessionTrack[req.session.userId]['roomNumber']
        } catch (e) {
        }
        if (roomNumber == null) {
            return;
        }

        const room = rooms[roomNumber];
        const playerNum = room.players.length;
        let [taskNeedPlayerNum, faultTolerant] = getNeedPlayerAndfaultTolerant(room.round, playerNum);
        cb(room.round, taskNeedPlayerNum, faultTolerant, room.voteHistory)
    });

    socket.on("disconnect", (reason) => {
        console.log(`${req.session.userId} disconnect because ${reason}`);
        var roomNumber = null;
        try {
            roomNumber = sessionTrack[req.session.userId]['roomNumber']
        } catch (e) {
        }

        if (roomNumber == null) {
            return;
        }

        // 查找玩家在房间中的索引
        const playerIndex = rooms[roomNumber].players.findIndex(player => player.session === req.session.userId);

        // 如果玩家存在于房间中，将他标记为离线
        if (playerIndex > -1) {
            rooms[roomNumber].players[playerIndex].online = false;
            socket.leave(roomNumber);
        }
    });
});

server.listen(PORT, () => {
    console.log('server started on port ' + PORT);
});
