const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000"],
        methods: ["GET", "POST"]
    }
});

// Serve static files from the React app build directory
app.use(express.static('build'));

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};

function getAllConnectedClients(roomId) {
    try {
        // Get all socket IDs in the room
        const room = io.sockets.adapter.rooms.get(roomId);
        if (!room) {
            return [];
        }
        
        return Array.from(room).map((socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }).filter(client => client.username); // Filter out clients without username
    } catch (error) {
        console.error('Error getting connected clients:', error);
        return [];
    }
}

io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        try {
            userSocketMap[socket.id] = username;
            socket.join(roomId);
            
            const clients = getAllConnectedClients(roomId);
            console.log(`${username} joined room ${roomId}. Total clients:`, clients.length);
            
            // Notify all clients in the room about the new user
            clients.forEach(({ socketId }) => {
                io.to(socketId).emit(ACTIONS.JOINED, {
                    clients,
                    username,
                    socketId: socket.id,
                });
            });
        } catch (error) {
            console.error('Error handling join event:', error);
        }
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        try {
            // Broadcast code change to all other clients in the room
            socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
        } catch (error) {
            console.error('Error handling code change:', error);
        }
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        try {
            // Send current code to a specific client
            io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
        } catch (error) {
            console.error('Error syncing code:', error);
        }
    });

    socket.on('disconnecting', () => {
        try {
            const rooms = [...socket.rooms];
            const username = userSocketMap[socket.id];
            
            console.log(`${username} is disconnecting from rooms:`, rooms);
            
            // Notify all rooms about the disconnection
            rooms.forEach((roomId) => {
                if (roomId !== socket.id) { // Skip the default room (socket's own room)
                    socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                        socketId: socket.id,
                        username: username,
                    });
                }
            });
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    });

    socket.on('disconnect', () => {
        try {
            const username = userSocketMap[socket.id];
            console.log(`Socket disconnected: ${socket.id} (${username})`);
            delete userSocketMap[socket.id];
        } catch (error) {
            console.error('Error cleaning up after disconnect:', error);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});