import multer from "multer";
import { logger } from "../utils/logger.js";

/**
 * A single place to turn any error - from a controller, a service, or
 * Multer itself - into a consistent, safe HTTP response. Must be
 * registered last, after every route, per Express's error-middleware
 * convention (four arguments signals Express to treat it as an error
 * handler).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  logger.error({ err: error }, "Request failed");

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File is too large." });
    }
    return res.status(400).json({ error: error.message });
  }

  if (error.message === "Only PDF files are allowed.") {
    return res.status(400).json({ error: error.message });
  }

  // Never leak internal error details (stack traces, DB errors, API
  // error bodies) to the client - log them, but respond generically.
  res.status(500).json({
    error: "Something went wrong. Please try again later.",
  });
}
