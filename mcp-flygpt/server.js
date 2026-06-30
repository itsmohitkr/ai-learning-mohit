// server.js — Express entry point
// Connects to all MCP servers once at startup, then handles /ask requests.

import express from "express";
import dotenv from "dotenv";
import { MCPClientManager } from "./src/mcpClient.js";
import { runAgent } from "./src/agent.js";

dotenv.config();

const app = express();
app.use(express.json());

const mcpManager = new MCPClientManager();

app.post("/ask", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Missing 'query' in request body" });

  try {
    const answer = await runAgent(query, mcpManager);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

async function start() {
  console.log("[Startup] Connecting to MCP servers...");
  await mcpManager.connectAll();
  console.log(`[Startup] ${mcpManager.allTools.length} total tool(s) available across all servers`);

  app.listen(PORT, () => {
    console.log(`FlyGPT running on http://localhost:${PORT}`);
  });
}

start();
