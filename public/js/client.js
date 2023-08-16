const socket = io.connect('http://localhost:3000');

// 当用户点击"加入房间"按钮时
document.getElementById('joinRoom').addEventListener('click', () => {
    const roomNumber = document.getElementById('roomNumberInput').value; // 获取输入的房间名
    socket.emit('joinRoom', roomNumber);
});

// 当用户点击"开始游戏"按钮时
document.getElementById('startGame').addEventListener('click', () => {
    const roomNumber = document.getElementById('roomNumberInput').value; // 获取输入的房间名
    socket.emit('startGame', roomNumber);
});

socket.on('gameStarted', (message) => {
    console.log(message); // 在控制台显示游戏已开始的消息
});

