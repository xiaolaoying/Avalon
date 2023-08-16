const socket = io.connect('http://localhost:3000');

document.getElementById('joinRoom').addEventListener('click', () => {
    console.log("joinRoom");
    socket.emit('joinRoom', 'roomName'); //假设只有一个房间
});

document.getElementById('startGame').addEventListener('click', () => {
    console.log("startGame");
    socket.emit('startGame');
});
