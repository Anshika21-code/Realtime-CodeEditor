import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: 'Infinity',
        timeout: 10000,
        transports: ['websocket', 'polling'], // Added polling for better production connectivity
        upgrade: true,
        rememberUpgrade: true,
    };
    
    try {
        // Production backend URL with fallback
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 
                          (process.env.NODE_ENV === 'production' 
                           ? 'https://realtime-code-editor-ochre.vercel.app'  // Replace with your Render URL
                           : 'http://localhost:5000');
        
        console.log('Connecting to:', backendUrl);
        
        const socket = io(backendUrl, options);
        
        return new Promise((resolve, reject) => {
            socket.on('connect', () => {
                console.log('Socket connected successfully');
                resolve(socket);
            });
            
            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                reject(error);
            });
            
            // Set a timeout for connection
            setTimeout(() => {
                if (!socket.connected) {
                    console.error('Socket connection timeout');
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    } catch (error) {
        console.error('Error initializing socket:', error);
        throw error;
    }
};