import { createServer } from "http";
import app from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import { initSocket } from "./socket/socket";

async function start() {
  await connectDB();

  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`Samvahak API running on http://localhost:${env.port}/api/v1 (${env.nodeEnv})`);
    console.log(`Socket.io listening on the same port`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    httpServer.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start();
