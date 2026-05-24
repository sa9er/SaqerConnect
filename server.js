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
  users.forEach((u, id) => {
    if (u.room === room) list.push({ userId: u.userId, socketId: id, theme: u.theme });
  });
  console.log('Broadcasting room users:', list.length);
  io.to(room).emit('room-users', list);
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id.substring(0, 8));

  socket.on('join', (data) => {
    const { userId, room, theme } = data;
    users.set(socket.id, { userId, room, theme });
    socket.join(room);
    console.log(`${userId} joined ${room}`);
    
    const history = messages.filter(m => m.room === room);
    socket.emit('message-history', history);
    broadcastRoomUsers(room);
  });

  socket.on('call-user', (data) => {
    const user = users.get(socket.id);
    if (!user) return;
    console.log(`${user.userId} calling`);
    socket.to(user.room).emit('incoming-call', { from: user.userId, callType: data.callType });
  });

  socket.on('signal', (data) => {
    console.log('Signal to', data.to?.substring(0, 8));
    io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    users.delete(socket.id);
    if (user) {
      console.log(`${user.userId} left`);
      broadcastRoomUsers(user.room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));
