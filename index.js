const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const PORT = process.env.PORT || 4000;

const http = require('http').Server(app);
const cors = require('cors');
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");

app.use(cors());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const { InMemorySessionStore } = require("./sessionStore");
const sessionStore = new InMemorySessionStore();

const { InMemoryMessageStore } = require("./messageStore");
const messageStore = new InMemoryMessageStore();

const socketIO = require('socket.io')(http, {
  cors: {
    origin: "*"
  }
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Hello world',
  });
});

http.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

http.keepAliveTimeout = 120 * 1000;
http.headersTimeout = 120 * 1000;

let activeUsers = [];
let activeSocketId = [];

socketIO.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    const session = sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      return next();
    }
  }
  socket.sessionID = randomId();
  socket.userID = randomId();
  next();
});

socketIO.on('connection', (socket) => {
  // persist session
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    connected: true,
  });
  socketIO.emit('socketID', socket.id);
  activeSocketId.push(socket.id);
    console.log(`⚡: ${socket.id} user just connected!`);
    var roomNum = "";

    socket.on('joinRoom', (data) => {
      // socketIO.join()
      // console.log(data.roomNum);
      roomNum = `${data.room}`;
      socket.join(roomNum);
      console.log(`successfully joined: ${roomNum}`);
    })

    socket.on('message', (data) => {
      const message = {
        data,
        roomNum: data.roomNum
      };
      socketIO.to(roomNum).emit('messageResponse', data);
      messageStore.saveMessage(message);
    });

    socket.on('typing', (data) => socket.broadcast.emit('typingResponse', data));

    socket.on('disconnect', () => {
      const id = socket.id
      console.log(`${id} disconnected`);
      socket.disconnect();
    });
});

app.post('/api/updateCurrentUsers', (req, res) => {
  var { userId } = req.body;
  activeUsers.push(userId);
  res.status(200).send("Success")
})

app.get('/api/currentUsers', (req, res) => {
  res.json({
    data: activeUsers,
  });
});