const { io } = require("socket.io-client");

const socket = io("https://localhost", {
  transports: ["websocket"],
  rejectUnauthorized: false,
});

socket.on("connect", () => {
  socket.emit('updateMessage', {
    messageId: '694129b0b248c3b74c78fbc6',
    textContent: '??? gi vay'
  });
  socket.on('messageDeleted', response => {
    console.log(response)
  })
});

socket.on("connect_error", (err) => {
  console.error("❌ Connect error:", err);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected");
});
