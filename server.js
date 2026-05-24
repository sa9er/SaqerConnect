const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Rooms: { roomName: [socket1, socket2, ...] }
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Connected:', socket.id.substring(0, 8));

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    
    const clients = io.sockets.adapter.rooms.get(roomId);
    const count = clients ? clients.size : 0;
    
    console.log(`Room ${roomId}: ${count} users`);
    socket.to(roomId).emit('user-joined', { userId: socket.id, count });
    
    // If 2+ people, notify they can call
    if (count >= 2) {
      io.to(roomId).emit('ready-to-call', { count });
    }
  });

  // WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', { offer: data.offer, from: socket.id });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', { answer: data.answer, from: socket.id });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-left', { userId: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Signaling server on ${PORT}`));
