const socket = io.connect('http://localhost:3000');

// 当用户点击"加入房间"按钮时
document.getElementById('joinRoom').addEventListener('click', () => {
    const roomNumber = document.getElementById('roomNumberInput').value;
    const playerName = document.getElementById('playerNameInput').value;
    
    socket.emit('joinRoom', roomNumber, playerName);
});

socket.on('updatePlayers', (players) => {
    const playerListDiv = document.getElementById('playerList');
    playerListDiv.innerHTML = ''; // 清除现有玩家列表

    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.textContent = player;
        playerListDiv.appendChild(playerDiv);
    });
});

socket.on('receiveRole', (roleName, canSeeDesc, canSeeIndex) => {
    console.log(`你的身份是：${roleName}\n${canSeeDesc}: ${canSeeIndex}`);
});

socket.on('gameStarted', () => {
    // 进行其他游戏开始后的逻辑
});

// 当用户点击"开始游戏"按钮时
document.getElementById('startGame').addEventListener('click', () => {
    const roomNumber = document.getElementById('roomNumberInput').value; // 获取输入的房间名
    socket.emit('startGame', roomNumber);
});

socket.on('gameStarted', (message) => {
    console.log(message); // 在控制台显示游戏已开始的消息
});

