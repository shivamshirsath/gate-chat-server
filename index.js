const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const io = new Server(PORT, {
  cors: {
    origin: "*", 
  }
});

console.log(`🚀 Chat Server running on port ${PORT}`);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 1. Relay Message
  socket.on("send_message", (data) => {
    io.emit("receive_message", data);
  });

  // 2. Relay Delete Signal (Pure Logic, No DB)
  socket.on("delete_message", (messageId) => {
    console.log("Broadcasting delete for ID:", messageId);
    io.emit("message_deleted", messageId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});
