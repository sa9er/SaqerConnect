const store = require('../store');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function handleJoin(io, socket, data) {
  const { userId, room, theme } = data;
  store.addUser(socket.id, { userId, room, theme });
  socket.join(room);
  
  const history = store.getRoomMessages(room);
  socket.emit('message-history', history);
  
  const users = store.getRoomUsers(room);
  io.to(room).emit('room-users', users);
  
  console.log(`${userId} joined ${room}`);
}

function handleSendMessage(io, socket, data) {
  const user = store.getUser(socket.id);
  if (!user) return;
  
  const msg = {
    id: generateId(),
    room: user.room,
    userId: user.userId,
    text: data.text,
    theme: user.theme,
    createdAt: Date.now(),
  };
  
  store.addMessage(msg);
  io.to(user.room).emit('new-message', msg);
}

function handleDisconnect(io, socket) {
  const user = store.removeUser(socket.id);
  if (user) {
    const users = store.getRoomUsers(user.room);
    io.to(user.room).emit('room-users', users);
    console.log(`${user.userId} left`);
  }
}

module.exports = {
  handleJoin,
  handleSendMessage,
  handleDisconnect,
};
