import express from "express";
import pinoHttp from "pino-http";
import documentRoutes from "./routes/documents.js";
import chatRoutes from "./routes/chat.js";
import healthRoutes from "./routes/health.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

app.use("/api", healthRoutes);
app.use("/api", documentRoutes);
app.use("/api", chatRoutes);

// Error-handling middleware must be registered last.
app.use(errorHandler);

export default app;
