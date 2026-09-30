import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/logger";
import { notFound } from "./middleware/notFound";
import apiRouter from "./routes";

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

app.use("/api", apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
