import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
});

// An idle client in the pool can occasionally emit an error (e.g. the
// database restarting). Without this handler, that error is unhandled
// and crashes the entire Node process.
pool.on("error", (error) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected PostgreSQL pool error:", error);
});
