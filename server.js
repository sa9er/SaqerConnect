const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const store = require('./store');
const { handleJoin, handleSendMessage, handleDisconnect } = require('./handlers/chat');
const { handleCallUser, handleSignal } = require('./handlers/calls');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    users: store.getUserCount(),
    messages: store.getMessageCount()
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log('Connected:', socket.id.substring(0, 8));

  socket.on('join', (data) => handleJoin(io, socket, data));
  socket.on('send-message', (data) => handleSendMessage(io, socket, data));
  socket.on('call-user', (data) => handleCallUser(io, socket, data));
  socket.on('signal', (data) => handleSignal(io, socket, data));
  socket.on('disconnect', () => handleDisconnect(io, socket));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));
