import { io, Socket } from "socket.io-client";
import { getToken } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Determine the socket URL. Since we attached it to the main backend server, 
    // it's the same origin as the API URL but without the /api path.
    const apiUrl = "https://institute-api.rhaitech.online/arise/api" || "https://institute-api.rhaitech.online/arise/api";
    const socketUrl = apiUrl.replace(/\/api\/?$/, "");

    const token = getToken();
    
    // Extract the path if there's a subpath in the URL (e.g. /arise)
    const urlObj = new URL(socketUrl);
    const subPath = urlObj.pathname === '/' ? '' : urlObj.pathname;
    
    socket = io(urlObj.origin, {
      path: `${subPath}/socket.io/`,
      auth: { token: token || "" },
      transports: ["websocket", "polling"],
      autoConnect: Boolean(token),
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
