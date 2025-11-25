const { Server } = require("socket.io");
const mongoose = require("mongoose");
const http = require("http"); // 🔥 REQUIRED FOR RENDER

const PORT = process.env.PORT || 3000;

const MONGO_URI = "mongodb+srv://shivam:shivam@cluster0.ysyftvz.mongodb.net/?appName=Cluster0";

// 1. Create Standard HTTP Server (To satisfy Render Health Check)
const httpServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Gate Chat Server is Running! 🚀");
});

// 2. Attach Socket.io to the HTTP Server
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// 3. Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// 4. Define Schema
const MessageSchema = new mongoose.Schema({
  id: String,
  text: String,
  sender: String,
  uid: String,
  time: Number,
  isPremium: Boolean,
  createdAt: { type: Date, default: Date.now, expires: 18000 } 
});

const Message = mongoose.model("Message", MessageSchema);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Load History
  Message.find().sort({ time: 1 }).limit(50)
    .then(messages => socket.emit("load_history", messages))
    .catch(err => console.error("Load Error:", err));

  // Send Message
  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message(data);
      await newMessage.save();
      io.emit("receive_message", data);
    } catch(e) { console.error("Save Error", e); }
  });

  // Delete Message
  socket.on("delete_message", async (messageId) => {
    try {
      await Message.deleteOne({ id: messageId });
      io.emit("message_deleted", messageId);
    } catch(e) { console.error("Delete Error", e); }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// 5. 🔥 LISTEN ON THE HTTP SERVER (Not just the Socket)
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

