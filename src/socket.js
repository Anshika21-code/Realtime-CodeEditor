import { io } from "socket.io-client";

export const initSocket = () => {
  const URL = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

  return io(URL, {
    forceNew: true,                 // corrected key
    reconnectionAttempts: Infinity, // number, not string
    timeout: 10000,
    transports: ["websocket"],
  });
};
