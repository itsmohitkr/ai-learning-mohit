import { Router } from "express";
import { pool } from "../db/postgres.js";

const router = Router();

/**
 * A minimal liveness/readiness check: confirms the process is up AND
 * that it can actually reach PostgreSQL. Useful for load balancers,
 * container orchestrators, or simple uptime monitoring.
 */
router.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

export default router;
