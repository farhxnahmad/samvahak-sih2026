import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { env } from "../config/env";
import { IAlert } from "../modules/alert/alert.model";

let io: SocketIOServer | null = null;

/**
 * Room convention:
 *   "district:<districtId>"  - clients watching one district
 *   "state:<stateId>"        - clients watching one state
 * A client can join either/both by emitting "join:district" / "join:state".
 */
function registerConnectionHandlers(socket: Socket) {
  socket.on("join:district", (districtId: string) => {
    if (typeof districtId === "string" && districtId) socket.join(`district:${districtId}`);
  });
  socket.on("leave:district", (districtId: string) => {
    if (typeof districtId === "string" && districtId) socket.leave(`district:${districtId}`);
  });
  socket.on("join:state", (stateId: string) => {
    if (typeof stateId === "string" && stateId) socket.join(`state:${stateId}`);
  });
  socket.on("leave:state", (stateId: string) => {
    if (typeof stateId === "string" && stateId) socket.leave(`state:${stateId}`);
  });
}

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.clientOrigin },
  });

  io.on("connection", (socket) => {
    console.log(`socket connected: ${socket.id}`);
    registerConnectionHandlers(socket);
    socket.on("disconnect", () => console.log(`socket disconnected: ${socket.id}`));
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io not initialized — call initSocket(httpServer) first");
  return io;
}

/** Sends a newly created alert to everyone, and to clients scoped to its district. */
export function broadcastAlert(alert: IAlert & { _id: unknown }) {
  const payload = { event: "alert:new" as const, alert };
  getIO().to(`district:${alert.district.toString()}`).emit("alert:new", payload.alert);
  getIO().emit("alert:new", payload.alert); // global feed
}

/** Sends a status change (resolved/expired) the same way. */
export function broadcastAlertUpdate(alert: IAlert & { _id: unknown }) {
  getIO().to(`district:${alert.district.toString()}`).emit("alert:updated", alert);
  getIO().emit("alert:updated", alert);
}
