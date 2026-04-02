import { io } from "socket.io-client";

let socketInstance;

function resolveSocketUrl() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
  }

  return process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
}

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(resolveSocketUrl(), {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketInstance.on("connect", () => {
      socketInstance.emit("join_admin_room");
    });
  }

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}
