const { Server } = require("socket.io");
const mongoose = require("mongoose");
const http = require("http"); 
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const MONGO_URI = "mongodb+srv://shivam:shivam@cluster0.ysyftvz.mongodb.net/?appName=Cluster0";

const httpServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Gate Chat Server Running");
});

const io = new Server(httpServer, { cors: { origin: "*" } });

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Error:", err));

const MessageSchema = new mongoose.Schema({
  id: String,
  text: String,
  sender: String,
  uid: String,
  time: Number,
  isPremium: Boolean,
  replyToId: { type: String, default: null },
  replyToText: { type: String, default: null },
  replyToSender: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, expires: 604800 } // 7 Days expiry
});

const Message = mongoose.model("Message", MessageSchema);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // -------------------------------------------------------
  // 1. SYNC PROTOCOL (The WhatsApp Logic)
  // -------------------------------------------------------
  socket.on("request_sync", async (lastKnownTimestamp) => {
    try {
      const time = lastKnownTimestamp || 0;
      console.log(`Client asking for messages since: ${time}`);

      // Get ALL messages after the user's last known time
      // Limit set to 2000 to prevent crashing if user was gone for months
      const missedMessages = await Message.find({ time: { $gt: time } })
                                          .sort({ time: 1 })
                                          .limit(2000);
                                          
      socket.emit("sync_response", missedMessages);
    } catch (e) {
      console.error("Sync Error:", e);
    }
  });

  // -------------------------------------------------------
  // 2. LIVE MESSAGING
  // -------------------------------------------------------
  socket.on("send_message", async (data) => {
    // Instant Broadcast
    io.emit("receive_message", data);

    // Background Save
    try {
      const newMessage = new Message(data);
      await newMessage.save();
    } catch(e) { console.error("Save Error:", e); }
  });

  socket.on("delete_message", async (messageId) => {
    try {
      await Message.deleteOne({ id: messageId });
      io.emit("message_deleted", messageId);
    } catch(e) { console.error("Delete Error", e); }
  });

  socket.on("disconnect", () => console.log("User disconnected"));
});

httpServer.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
