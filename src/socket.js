import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: 5,  // Changed from 'Infinity' to avoid infinite loops
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        transports: ['polling', 'websocket'], // Start with polling, then upgrade to websocket
        upgrade: true,
        rememberUpgrade: false, // Don't remember upgrade in case of connection issues
        autoConnect: true,
        forceNew: true
    };
    
    try {
        // Determine backend URL based on environment
        const getBackendUrl = () => {
            // For production, if we're on the same domain (full-stack deployment)
            if (process.env.NODE_ENV === 'production') {
                // If you have a separate backend URL, use environment variable
                if (process.env.REACT_APP_BACKEND_URL) {
                    return process.env.REACT_APP_BACKEND_URL;
                }
                // Otherwise, use same origin (for Render full-stack deployment)
                return window.location.origin;
            }
            // Development
            return 'http://localhost:5000';
        };
        
        const backendUrl = getBackendUrl();
        console.log('Attempting to connect to:', backendUrl);
        
        const socket = io(backendUrl, options);
        
        return new Promise((resolve, reject) => {
            let connectionTimeout;
            
            socket.on('connect', () => {
                console.log('✅ Socket connected successfully');
                console.log('Socket ID:', socket.id);
                clearTimeout(connectionTimeout);
                resolve(socket);
            });
            
            socket.on('connect_error', (error) => {
                console.error('❌ Socket connection error:', error);
                console.error('Error details:', {
                    message: error.message,
                    description: error.description,
                    context: error.context
                });
                clearTimeout(connectionTimeout);
                reject(error);
            });
            
            socket.on('disconnect', (reason) => {
                console.warn('⚠️ Socket disconnected:', reason);
                
                // Attempt to reconnect for certain disconnect reasons
                if (reason === 'io server disconnect') {
                    console.log('🔄 Server disconnected, attempting to reconnect...');
                    socket.connect();
                }
            });
            
            socket.on('reconnect', (attemptNumber) => {
                console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
            });
            
            socket.on('reconnect_error', (error) => {
                console.error('❌ Socket reconnection error:', error);
            });
            
            socket.on('reconnect_failed', () => {
                console.error('❌ Socket reconnection failed');
            });
            
            // Set connection timeout
            connectionTimeout = setTimeout(() => {
                if (!socket.connected) {
                    console.error('⏰ Socket connection timeout');
                    socket.close();
                    reject(new Error('Connection timeout - server may be starting up'));
                }
            }, 15000); // Increased timeout for Render cold starts
        });
    } catch (error) {
        console.error('❌ Error initializing socket:', error);
        throw error;
    }
};

// Helper function to check if socket is connected
export const isSocketConnected = (socket) => {
    return socket && socket.connected;
};

// Helper function to safely emit events
export const safeEmit = (socket, event, data) => {
    if (isSocketConnected(socket)) {
        socket.emit(event, data);
        return true;
    } else {
        console.warn('⚠️ Cannot emit - socket not connected');
        return false;
    }
};