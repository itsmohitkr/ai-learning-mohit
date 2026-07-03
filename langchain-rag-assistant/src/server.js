import "./config/env.js"; // validates required env vars before anything else runs
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

app.listen(env.port, () => {
  logger.info(`Server running on port ${env.port}`);
});
