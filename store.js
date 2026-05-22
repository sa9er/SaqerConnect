// In-memory data store for FamilyConnect server

const users = new Map();   // socketId -> { userId, room, theme }
const messages = [];       // Message objects

function getRoomUsers(room) {
  const list = [];
  users.forEach((u, id) => {
    if (u.room === room) list.push({
      userId: u.userId,
      socketId: id,
      theme: u.theme
    });
  });
  return list;
}

function getRoomMessages(room) {
  return messages.filter(m => m.room === room);
}

function addMessage(msg) {
  messages.push(msg);
  if (messages.length > 500) messages.shift();
  return msg;
}

function addUser(socketId, data) {
  users.set(socketId, {
    userId: data.userId,
    room: data.room,
    theme: data.theme || '#e94560'
  });
}

function removeUser(socketId) {
  const user = users.get(socketId);
  users.delete(socketId);
  return user;
}

function getUser(socketId) {
  return users.get(socketId);
}

function getUserCount() {
  return users.size;
}

function getMessageCount() {
  return messages.length;
}

module.exports = {
  getRoomUsers,
  getRoomMessages,
  addMessage,
  addUser,
  removeUser,
  getUser,
  getUserCount,
  getMessageCount,
};
