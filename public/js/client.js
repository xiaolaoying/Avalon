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

// 当用户点击"离开房间"按钮时
document.getElementById('leaveRoom').addEventListener('click', () => {
    const roomNumber = document.getElementById('roomNumberInput').value;
    const playerName = document.getElementById('playerNameInput').value;

    socket.emit('leaveRoom', roomNumber, playerName);
});

socket.on('receiveRole', (roleName, canSeeDesc, canSeeRoles) => {
    // 获取playerList div元素
    const playerListDiv = document.getElementById('playerList');

    // 创建一个新的div元素用于显示角色信息
    const roleInfoDiv = document.createElement('div');

    // 添加身份信息
    const rolePara = document.createElement('p');
    rolePara.textContent = `你的身份是：${roleName}`;
    roleInfoDiv.appendChild(rolePara);

    // 如果有额外的身份信息，那么显示它
    if (canSeeDesc !== "") {
        const seeInfoPara = document.createElement('p');
        const rolesString = canSeeRoles.join(', '); // 把数组转换为逗号分隔的字符串
        seeInfoPara.textContent = `${canSeeDesc}: ${rolesString}`;
        roleInfoDiv.appendChild(seeInfoPara);
    }

    // 将新创建的div添加到playerList div的后面
    playerListDiv.parentNode.insertBefore(roleInfoDiv, playerListDiv.nextSibling);
});

socket.on('gameStarted', () => {
    // 进行其他游戏开始后的逻辑
});

// 当用户点击"开始游戏"按钮时
document.getElementById('startGame').addEventListener('click', () => {
    const roomNumber = document.getElementById('roomNumberInput').value; // 获取输入的房间名
    socket.emit('startGame', roomNumber);
});

