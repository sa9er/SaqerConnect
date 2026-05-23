const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, transports: ['websocket', 'polling'] });

const users = new Map();
const messages = [];

function broadcastRoomUsers(room) {
  const list = [];
  users.forEach((u, id) => { if (u.room === room) list.push({ userId: u.userId, socketId: id }); });
  io.to(room).emit('room-users', list);
}

io.on('connection', (socket) => {
  socket.on('join', (data) => {
    const { userId, room } = data;
    users.set(socket.id, { userId, room });
    socket.join(room);
    socket.emit('message-history', messages.filter(m => m.room === room));
    broadcastRoomUsers(room);
  });

  socket.on('send-message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    const msg = { id: Date.now().toString(36), room: user.room, userId: user.userId, text: data.text, createdAt: Date.now() };
    messages.push(msg);
    if (messages.length > 500) messages.shift();
    io.to(user.room).emit('new-message', msg);
  });

  socket.on('call-user', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.to(user.room).emit('incoming-call', { from: user.userId, callType: data.callType });
  });

  socket.on('audio-data', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.to(user.room).emit('audio-data', data);
  });

  socket.on('signal', (data) => io.to(data.to).emit('signal', { from: socket.id, signal: data.signal }));
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    users.delete(socket.id);
    if (user) broadcastRoomUsers(user.room);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));
