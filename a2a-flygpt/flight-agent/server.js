// server.js — boot order matters
//
// The Flight Agent must discover the Hotel Agent BEFORE it can offer A2A
// skills to the LLM. This means the Hotel Agent has to already be running
// when the Flight Agent starts — a real dependency, made explicit instead
// of hidden.

require('dotenv').config();
const express = require('express');
const mcpClient = require('./src/mcpClient');
const a2aClient = require('./src/a2aClient');
const a2aConfig = require('./a2a.config.json');
const { runAgent } = require('./src/agent');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.post('/ask', async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: '"task" is required' });

  const start = Date.now();
  try {
    const answer = await runAgent(task);
    res.json({ task, answer, duration_ms: Date.now() - start });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

async function start() {
  console.log('[SERVER] Initialising MCP servers...');
  await mcpClient.initMcpServers();

  console.log('[SERVER] Discovering A2A agents...');
  try {
    await a2aClient.discoverAllAgents(a2aConfig);
  } catch (err) {
    console.error('[SERVER] A2A discovery failed — is the Hotel Agent running on port 4001?');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[SERVER] Flight Agent running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('[SERVER] Startup failed:', err.message);
  process.exit(1);
});
