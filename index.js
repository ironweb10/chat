const express = require('express');
const next = require('next');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = socketIo(httpServer);

  server.use(express.static(path.join(__dirname, 'public')));

  let numUsers = 0;

  io.on('connection', (socket) => {
    let addedUser = false;

    socket.on('new message', (data) => {
      socket.broadcast.emit('new message', {
        username: socket.username,
        message: data
      });
    });

    socket.on('add user', (username) => {
      if (addedUser) return;

      socket.username = username;
      ++numUsers;
      addedUser = true;
      socket.emit('login', {
        numUsers: numUsers
      });
      socket.broadcast.emit('user joined', {
        username: socket.username,
        numUsers: numUsers
      });
    });

    socket.on('typing', () => {
      socket.broadcast.emit('typing', {
        username: socket.username
      });
    });

    socket.on('stop typing', () => {
      socket.broadcast.emit('stop typing', {
        username: socket.username
      });
    });

    socket.on('disconnect', () => {
      if (addedUser) {
        --numUsers;

        socket.broadcast.emit('user left', {
          username: socket.username,
          numUsers: numUsers
        });
      }
    });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`Server listening at http://localhost:${port}`);
  });
});
