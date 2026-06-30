// server.js — Flight Agent's A2A server surface
//
// THE key structural change from lesson 06: this file used to run an
// LLM agent loop (agent.js) that called Hotel Agent via A2A. Now it has
// no LLM loop and no knowledge of any other agent — it's a pure A2A
// server, structurally IDENTICAL to hotel-agent/server.js. Compare the
// two files side by side: same 3 endpoints, same task lifecycle, same
// shape. That symmetry is the entire point of this lesson.
//
// Flight Agent still talks to Joy Air, but only via skills.js → mcpClient.js,
// fully internal — nothing about MCP is visible from the outside.

require('dotenv').config();
const express = require('express');
const agentCard = require('./src/agentCard');
const { createTask, updateTaskStatus, getTask } = require('./src/taskStore');
const skills = require('./src/skills');
const mcpClient = require('./src/mcpClient');

const app = express();
const PORT = process.env.PORT || 4002;
app.use(express.json());

// ── 1. DISCOVERY ───────────────────────────────────────────────────
app.get('/.well-known/agent.json', (_req, res) => {
  res.json(agentCard);
});

// ── 2. TASK ASSIGNMENT ────────────────────────────────────────────
app.post('/tasks/send', async (req, res) => {
  const { skillId, input } = req.body;

  const validSkill = agentCard.skills.find(s => s.id === skillId);
  if (!validSkill) {
    return res.status(400).json({
      error: `Unknown skill: ${skillId}. Available: ${agentCard.skills.map(s => s.id).join(', ')}`,
    });
  }

  const task = createTask(skillId, input);
  console.log(`[FLIGHT AGENT] Task ${task.id} created — skill: ${skillId}`);

  res.status(202).json(task);

  processTask(task.id, skillId, input).catch(err => {
    console.error(`[FLIGHT AGENT] Task ${task.id} crashed:`, err.message);
    updateTaskStatus(task.id, 'failed', { error: err.message });
  });
});

async function processTask(taskId, skillId, input) {
  updateTaskStatus(taskId, 'working');
  console.log(`[FLIGHT AGENT] Task ${taskId} → working`);

  let result;
  if (skillId === 'search_flights') result = await skills.searchFlights(input);
  else if (skillId === 'book_flight') result = await skills.bookFlight(input);
  else throw new Error(`No handler for skill: ${skillId}`);

  if (result.error) {
    updateTaskStatus(taskId, 'failed', { error: result.error });
  } else {
    updateTaskStatus(taskId, 'completed', { result });
    console.log(`[FLIGHT AGENT] Task ${taskId} → completed`);
  }
}

// ── 3. STATUS CHECK ──────────────────────────────────────────────
app.get('/tasks/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.get('/health', (_req, res) => res.json({ status: 'ok', agent: agentCard.name }));

async function start() {
  console.log('[FLIGHT AGENT] Connecting to Joy Air MCP server...');
  await mcpClient.connect();

  app.listen(PORT, () => {
    console.log(`[FLIGHT AGENT] Running at http://localhost:${PORT}`);
    console.log(`[FLIGHT AGENT] Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
  });
}

start().catch(err => {
  console.error('[FLIGHT AGENT] Startup failed:', err.message);
  process.exit(1);
});
