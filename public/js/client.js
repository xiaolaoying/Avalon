const socket = io.connect('http://localhost:3000');

// 当用户点击"加入房间"按钮时
document.getElementById('joinRoom').addEventListener('click', () => {
    const roomNumber = document.getElementById('roomNumberInput').value;
    const playerName = document.getElementById('playerNameInput').value;

    socket.emit('joinRoom', roomNumber, playerName);
});

// 当用户点击"离开房间"按钮时
document.getElementById('leaveRoom').addEventListener('click', () => {
    const roomNumber = document.getElementById('roomNumberInput').value;
    const playerName = document.getElementById('playerNameInput').value;

    socket.emit('leaveRoom', roomNumber, playerName);
});

// 当用户点击"开始游戏"按钮时
document.getElementById('startGame').addEventListener('click', () => {
    const roomNumber = document.getElementById('roomNumberInput').value; // 获取输入的房间名
    socket.emit('startGame', roomNumber);
});

// 当用户点击"确认队伍"按钮时
document.getElementById('confirmTeam').addEventListener('click', () => {
    playerListDiv = document.getElementById('playerList');
    // console.log('confirmTeam');
    const selectedTeam = [];
    const checkboxes = playerListDiv.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedTeam.push(checkbox.value);
        }
    });

    if (selectedTeam.length) {
        socket.emit('teamSelected', selectedTeam);
        // isCaptainTurn = false; // 清除队长轮次标记
        // confirmTeamButton.style.display = 'none'; // 隐藏确认按钮
        // checkboxes.forEach(checkbox => {
        //     checkbox.disabled = true; // 禁用所有复选框
        // });
    } else {
        alert('你需要选择至少一个玩家！');
    }
});

// 当用户点击"赞成"按钮时
document.getElementById('approveButton').addEventListener('click', () => {
    socket.emit('openVote', 'approve');
    // 在投票后，你可以选择隐藏或禁用投票按钮
    approveButton.style.display = 'none';
    opposeButton.style.display = 'none';
});

// 当用户点击"反对"按钮时
document.getElementById('opposeButton').addEventListener('click', () => {
    socket.emit('openVote', 'oppose');
    // 在投票后，你可以选择隐藏或禁用投票按钮
    approveButton.style.display = 'none';
    opposeButton.style.display = 'none';
});

socket.on('updatePlayers', (players) => {
    const playerListDiv = document.getElementById('playerList');
    playerListDiv.innerHTML = ''; // 清除现有玩家列表

    players.forEach(player => {
        const playerDiv = document.createElement('div');
        const playerCheckbox = document.createElement('input');
        playerCheckbox.type = 'checkbox';
        playerCheckbox.value = player;
        playerCheckbox.id = 'player-' + player;
        playerCheckbox.style.display = 'none'; // 默认隐藏复选框

        const playerLabel = document.createElement('label');
        playerLabel.htmlFor = 'player-' + player;
        playerLabel.textContent = player;

        playerDiv.appendChild(playerCheckbox);
        playerDiv.appendChild(playerLabel);
        playerListDiv.appendChild(playerDiv);
    });
});

socket.on('receiveRole', (roleName, canSeeDesc, canSeeRoles) => {
    const roleInfoDiv = document.getElementById('roleInfo');
    roleInfoDiv.style.display = 'block';

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
});

socket.on('gameStarted', () => {
    document.getElementById('confirmTeam').style.display = 'inline';
    const playerListDiv = document.getElementById('playerList');
    const checkboxes = playerListDiv.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.style.display = 'inline'; // 启用所有复选框
    });
});

// // 当轮到队长选择玩家组队时
// socket.on('captainTurn', () => {
//     isCaptainTurn = true; // 标记为队长的轮次
//     const checkboxes = playerListDiv.querySelectorAll('input[type="checkbox"]');
//     checkboxes.forEach(checkbox => {
//         checkbox.disabled = false; // 启用所有复选框
//     });
//     confirmTeamButton.style.display = 'block';  // 显示确认按钮
// });

// 监听 'error' 事件
socket.on('error', (errorMsg) => {
    alert(errorMsg); // 使用alert来显示错误信息
});

// 当收到队伍名单时
socket.on('teamAnnounced', (selectedTeam) => {
    document.getElementById('playerList').style.display = 'none';
    document.getElementById('confirmTeam').style.display = 'none';

    const teamAnnounceDiv = document.getElementById('teamAnnounced');
    teamAnnounceDiv.style.display = 'block';
    teamAnnounceDiv.textContent = `队长选择了以下玩家组队: ${selectedTeam.join(', ')}`;

    const approveButton = document.getElementById('approveButton');
    const opposeButton = document.getElementById('opposeButton');
    approveButton.style.display = 'inline';
    opposeButton.style.display = 'inline';
});

socket.on('voteResult', function (detailedResult) {
    document.getElementById('voteResultDisplay').style.display = 'block';

    // 获取显示结果的DOM元素
    const resultMessageElem = document.getElementById('resultMessage');
    const approveNamesElem = document.getElementById('approveNames');
    const opposeNamesElem = document.getElementById('opposeNames');

    // 更新显示的结果
    resultMessageElem.textContent = detailedResult.message;
    approveNamesElem.textContent = detailedResult.approveNames.join(', ');
    opposeNamesElem.textContent = detailedResult.opposeNames.join(', ');
});

socket.on('beginSecretVote', () => {
    // 显示秘密投票界面
    document.getElementById('secretVoteDisplay').style.display = 'block';
});

// 当用户开始"秘密投票"时调用
function submitVote(vote) {
    const roomNumber = document.getElementById('roomNumberInput').value;
    socket.emit('submitSecretVote', roomNumber, vote);
    // 隐藏秘密投票界面
    document.getElementById('secretVoteDisplay').style.display = 'none';
}

socket.on('secretVoteResult', result => {
    // 显示秘密投票结果
    const resultDisplay = document.getElementById('secretVoteResultDisplay');
    const resultMessage = document.getElementById('secretResultMessage');

    resultDisplay.style.display = 'block';
    resultMessage.textContent = result;

    // 设置一个5秒的定时器来隐藏显示
    setTimeout(() => {
        resultDisplay.style.display = 'none';
        document.getElementById('teamAnnounced').style.display = 'none';
        document.getElementById('voteResultDisplay').style.display = 'none';

        document.getElementById('playerList').style.display = 'block';
        document.getElementById('confirmTeam').style.display = 'inline';
    }, 5000);  // 5000毫秒等于5秒
});

socket.on('nextOpenVote', () => {
    // 设置一个5秒的定时器来隐藏显示
    setTimeout(() => {
        document.getElementById('teamAnnounced').style.display = 'none';
        document.getElementById('voteResultDisplay').style.display = 'none';

        document.getElementById('playerList').style.display = 'block';
        document.getElementById('confirmTeam').style.display = 'inline';
    }, 5000);  // 5000毫秒等于5秒
});
