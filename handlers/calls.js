const store = require('../store');

function handleCallUser(io, socket, data) {
  const user = store.getUser(socket.id);
  if (!user) return;
  
  socket.to(user.room).emit('incoming-call', {
    from: user.userId,
    callType: data.callType
  });
  
  console.log(`📞 ${user.userId} started ${data.callType} call`);
}

function handleSignal(io, socket, data) {
  io.to(data.to).emit('signal', {
    from: socket.id,
    signal: data.signal
  });
}

module.exports = {
  handleCallUser,
  handleSignal,
};
