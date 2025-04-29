const http = require("http");
const { Server } = require("socket.io");

const socketServer = http.createServer();
const io = new Server(socketServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
  // Join and leave rooms for targeted notifications
  socket.on("subscribe", (room) => {
    socket.join(room);
  });
  socket.on("unsubscribe", (room) => {
    socket.leave(room);
  });
});

socketServer.listen(process.env.SOCKET_PORT, () => {
  console.log(`Socket.IO server is running on http://localhost:${process.env.SOCKET_PORT}`);
});

exports.emitToId = (recieverId, emitName, message) => {
  io.to(recieverId).emit(emitName, message);
};

exports.emitToAll = (emitName, message) => {
  io.emit(emitName, message);
};
