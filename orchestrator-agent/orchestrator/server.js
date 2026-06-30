// server.js — the orchestrator's HTTP entry point
//
// Unlike lesson 06's Flight Agent, this server does NOT exit if a
// sub-agent is unreachable at startup. It boots regardless, runs with
// whatever sub-agents it managed to discover, and exposes an admin
// route to retry discovery for anything still missing — fixing the
// "boot-order coupling" problem directly.

require('dotenv').config();
const express = require('express');
const a2aClient = require('./src/a2aClient');
const a2aConfig = require('./a2a.config.json');
const { runOrchestrator } = require('./src/agent');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.post('/ask', async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: '"task" is required' });

  const start = Date.now();
  try {
    const answer = await runOrchestrator(task);
    res.json({ task, answer, duration_ms: Date.now() - start });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: see which sub-agents are currently known ────────────────
app.get('/admin/agents', (_req, res) => {
  res.json({ agents: a2aClient.listKnownAgents() });
});

// ── Admin: retry discovery for any sub-agent that wasn't reachable ───
// This is what makes the orchestrator resilient to boot order — you
// don't need to restart it once a slow-starting sub-agent comes online.
app.post('/admin/rediscover', async (_req, res) => {
  const nowKnown = await a2aClient.rediscoverMissing(a2aConfig);
  res.json({ known_agents: nowKnown });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

async function start() {
  console.log('[ORCHESTRATOR] Discovering sub-agents...');
  // Boots regardless of outcome — discoverAllAgents never throws,
  // it only logs warnings for agents it couldn't reach.
  await a2aClient.discoverAllAgents(a2aConfig);

  app.listen(PORT, () => {
    console.log(`[ORCHESTRATOR] Running at http://localhost:${PORT}`);
    console.log(`[ORCHESTRATOR] Known agents: ${a2aClient.listKnownAgents().map(a => a.name).join(', ') || '(none yet — try POST /admin/rediscover)'}`);
  });
}

start().catch(err => {
  console.error('[ORCHESTRATOR] Startup failed:', err.message);
  process.exit(1);
});
