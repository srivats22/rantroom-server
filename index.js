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
let chattingMap = new Map();
let activeUsersMap = new Map();
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
      roomNum = `${data.room}`;
      socket.join(roomNum);
      console.log(`successfully joined: ${roomNum}`);
    })

    socket.on('message', (data) => {
      const message = {
        data,
        roomNum: data.roomNum
      };
      console.log(message)
      socketIO.to(roomNum).emit('messageResponse', data);
      messageStore.saveMessage(message);
    });

    socket.on('typing', (data) => socket.broadcast.emit('typingResponse', data));

    socket.on('disconnect', () => {
      const id = socket.id
      var indexLocation = activeSocketId.indexOf(id);
      console.log('Location', indexLocation);
      activeUsers.delete(indexLocation);
      console.log(activeUsers);
      console.log(`${id} disconnected`);
      socket.disconnect();
    });
});

app.post('/api/updateCurrentUsers', (req, res) => {
  var { userId } = req.body;
  if(!activeUsers.includes(userId)){
    activeUsers.push(userId);
  }
})

app.get('/api/currentUsers', (req, res) => {
  res.status(200).send({data: activeUsers});
});

app.post('/api/updateUsersStatus', (req, res) => {
  var { userId } = req.body;
  // map has user's uid
  if(chattingMap.has(userId)){
    // change chatting to not-chatting
    if(chattingMap.get(userId) === 'chatting'){
      chattingMap.set(userId, 'not-chatting');
      res.status(200).send("Success");
    }
    // change not chatting to chatting
    else{
      chattingMap.set(userId, 'chatting');
      res.status(200).send("Success");
    }
  }
  else{
    chattingMap.set(userId, 'chatting');
    res.status(200).send("Success");
  }
})

app.get('/api/getUserStatus', (req, res) => {
  var { userId } = req.body;
  res.status(200).send({
    data: chattingMap.get(userId),
  })
})