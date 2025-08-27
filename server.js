const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');
const path = require('path');
const cors = require('cors');

const server = http.createServer(app);

// Enable CORS middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true  // Allow all origins in production
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? true  // Allow all origins in production - more flexible for deployment
      : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
    allowEIO3: true
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  // Catch all handler: send back React's index.html file for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    connectedClients: Object.keys(userSocketMap).length
  });
});

// API route to get server info
app.get('/api/info', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    connectedClients: Object.keys(userSocketMap).length,
    timestamp: new Date().toISOString()
  });
});

const userSocketMap = {};

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    console.log(`${username} joining room: ${roomId}`);
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    
    const clients = getAllConnectedClients(roomId);
    
    // Notify all clients in the room
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    console.log(`Code change in room: ${roomId}`);
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    console.log(`Syncing code to socket: ${socketId}`);
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Handle room leaving
  socket.on(ACTIONS.LEAVE, ({ roomId }) => {
    socket.leave(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
  });

  socket.on('disconnecting', () => {
    console.log(`Socket disconnecting: ${socket.id}`);
    const rooms = [...socket.rooms];
    
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    
    delete userSocketMap[socket.id];
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});