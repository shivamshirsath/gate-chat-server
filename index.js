const { Server } = require("socket.io");
const mongoose = require("mongoose");
const http = require("http"); 
require("dotenv").config(); // Ensure you have dotenv if using env vars

const PORT = process.env.PORT || 3000;

// ⚠️ SECURITY WARNING: In production, use process.env.MONGO_URI
const MONGO_URI = "mongodb+srv://shivam:shivam@cluster0.ysyftvz.mongodb.net/?appName=Cluster0";

// 1. Create Standard HTTP Server
const httpServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Gate Chat Server is Running! 🚀");
});

// 2. Attach Socket.io
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
  
  // Reply Fields
  replyToId: { type: String, default: null },
  replyToText: { type: String, default: null },
  replyToSender: { type: String, default: null },

  createdAt: { type: Date, default: Date.now, expires: 18000 } 
});

const Message = mongoose.model("Message", MessageSchema);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Load History (Limit 100 for better context)
  Message.find().sort({ time: 1 }).limit(100)
    .then(messages => socket.emit("load_history", messages))
    .catch(err => console.error("Load Error:", err));

  // -----------------------------------------------------------
  // 🔥 CRITICAL FIX: SEND IMMEDIATELY, SAVE LATER
  // -----------------------------------------------------------
  socket.on("send_message", async (data) => {
    // 1. Broadcast to everyone INSTANTLY (Fast)
    io.emit("receive_message", data);

    // 2. Save to Database in Background (Slow)
    try {
      const newMessage = new Message(data);
      await newMessage.save();
    } catch(e) { 
      console.error("Database Save Error (Message was sent though):", e); 
    }
  });

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

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
