const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const io = new Server(PORT, {
  cors: {
    origin: "*", // Allow connection from your App
  }
});

console.log(`🚀 Chat Server running on port ${PORT}`);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Listen for a message from the App
  socket.on("send_message", (data) => {
    // Broadcast it to EVERYONE (including the sender)
    io.emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});