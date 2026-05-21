const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
app.use(express.static('/data/data/com.termux/files/home/family-test'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const users = new Map();
const messages = []; // Simple in-memory store

function broadcastRoomUsers(room) {
  const list = [];
  users.forEach((u, id) => {
    if (u.room === room) list.push({ userId: u.userId, socketId: id });
  });
  io.to(room).emit('room-users', list);
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id.substring(0, 8));

  socket.on('join', (data) => {
    const { userId, room } = data;
    users.set(socket.id, { userId, room });
    socket.join(room);
    
    // Send message history
    const roomMessages = messages.filter(m => m.room === room);
    socket.emit('message-history', roomMessages);
    
    broadcastRoomUsers(room);
  });

  socket.on('send-message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      room: user.room,
      userId: user.userId,
      text: data.text,
      createdAt: Date.now(),
    };
    messages.push(msg);
    if (messages.length > 500) messages.shift(); // Keep last 500
    io.to(user.room).emit('new-message', msg);
  });

  socket.on('call-user', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.to(user.room).emit('incoming-call', { from: user.userId, callType: data.callType });
  });

  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    users.delete(socket.id);
    if (user) broadcastRoomUsers(user.room);
  });
});

server.listen(3000, '0.0.0.0', () => console.log('Server on 3000'));
