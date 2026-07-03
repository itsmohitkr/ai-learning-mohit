import "dotenv/config";

/**
 * Every environment variable the application cannot safely run without.
 * We validate these once, at startup, so a missing key fails immediately
 * and loudly instead of causing a confusing error deep inside a request.
 */
const required = ["OPENAI_API_KEY", "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(", ")}. ` +
      "Copy .env.example to .env and fill in real values before starting the server."
  );
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  openaiApiKey: process.env.OPENAI_API_KEY,

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB) || 10,
};
