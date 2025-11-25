const { Server } = require("socket.io");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;

// 🔥 YOUR DATABASE URL
const MONGO_URI = "mongodb+srv://siri:siri@cluster0.ysyftvz.mongodb.net/?appName=Cluster0";

// 1. Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// 2. Define Message Schema with AUTO-DELETE
const MessageSchema = new mongoose.Schema({
  id: String,
  text: String,
  sender: String,
  uid: String,
  time: Number,
  isPremium: Boolean,
  
  // 🔥 THIS IS THE MAGIC LINE
  // This field tells MongoDB to delete this document 18,000 seconds (5 hours) after creation.
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 18000 
  }
});

const Message = mongoose.model("Message", MessageSchema);

const io = new Server(PORT, {
  cors: { origin: "*" }
});

console.log(`🚀 Chat Server running on port ${PORT}`);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 3. Load History
  // (Old messages are already deleted by Mongo, so this query is fast)
  Message.find().sort({ time: 1 }).limit(50).then(messages => {
    socket.emit("load_history", messages);
  });

  // 4. Save & Send New Message
  socket.on("send_message", async (data) => {
    const newMessage = new Message(data);
    await newMessage.save();
    io.emit("receive_message", data);
  });

  // 5. Delete Message
  socket.on("delete_message", async (messageId) => {
    await Message.deleteOne({ id: messageId });
    io.emit("message_deleted", messageId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});
