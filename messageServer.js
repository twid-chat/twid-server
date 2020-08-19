require('dotenv').config();
const app = require('express')();
const http = require('http').createServer(app);
const jwt = require('jsonwebtoken');
const io = require('socket.io')(http);
const db = require('./db');

const PORT = 4002;

const getAllMessages = async () =>
  db
    .select('message_id', 'message', 'username', 'messages.created_at')
    .table('messages')
    .leftJoin('users', function () {
      this.on('messages.user_id', '=', 'users.user_id');
    });

io.use((socket, next) => {
  if (socket?.handshake?.query?.accessToken) {
    const token = socket.handshake.query.accessToken;

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        next(new Error('Authentication error'));
      } else {
        // eslint-disable-next-line no-param-reassign
        socket.decoded = decoded;
        next();
      }
    });
  } else {
    next(new Error('Authentication error'));
  }
}).on('connection', async socket => {
  const { userId } = socket.decoded;

  socket.on('get-messages', async () => {
    const allMessages = await getAllMessages();
    io.emit('get-messages', allMessages);
  });

  socket.on('new-message', async message => {
    await db('messages').insert({
      message,
      user_id: userId,
    });

    const allMessages = await getAllMessages();
    io.emit('get-messages', allMessages);
  });

  socket.on('delete-message', async messageId => {
    await db('messages').where('message_id', messageId).del();

    const allMessages = await getAllMessages();
    io.emit('get-messages', allMessages);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

http.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
