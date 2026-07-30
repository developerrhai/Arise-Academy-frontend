import { io, Socket } from "socket.io-client";
import { getToken } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Determine the socket URL. Since we attached it to the main backend server, 
    // it's the same origin as the API URL but without the /api path.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
    const socketUrl = apiUrl.replace(/\/api\/?$/, "");

    socket = io(socketUrl, {
      auth: { token: getToken() },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
