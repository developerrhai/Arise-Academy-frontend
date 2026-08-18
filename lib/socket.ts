import { io, Socket } from "socket.io-client";
import { getToken } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Determine the socket URL. Since we attached it to the main backend server, 
    // it's the same origin as the API URL but without the /api path.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
    console.log("[Socket Init] API URL is:", apiUrl);
    
    // Extract origin and path to handle NGINX path-based routing correctly
    // e.g., https://domain.com/arise/api -> origin: https://domain.com, basePath: /arise
    let origin = apiUrl;
    let basePath = "";
    try {
      const url = new URL(apiUrl);
      origin = url.origin;
      basePath = url.pathname.replace(/\/api\/?$/, "");
      console.log(`[Socket Init] Parsed URL - Origin: ${origin}, BasePath: ${basePath}`);
    } catch (e) {
      // Fallback for relative URLs if any
      origin = apiUrl.replace(/\/api\/?$/, "");
      console.log(`[Socket Init] Fallback parsing - Origin: ${origin}`);
    }

    const socketPath = basePath ? `${basePath}/socket.io` : "/socket.io";
    console.log(`[Socket Init] Connecting to Origin: ${origin} with Path: ${socketPath}`);

    socket = io(origin, {
      path: socketPath,
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
