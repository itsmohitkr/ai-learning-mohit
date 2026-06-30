// server.js — unchanged from a2a-flygpt/hotel-agent/server.js
// Hotel Agent was already the symmetric specialist shape — Flight Agent
// is the one that changed to match it, not the other way around.

require('dotenv').config();
const express = require('express');
const agentCard = require('./src/agentCard');
const { createTask, updateTaskStatus, getTask } = require('./src/taskStore');
const skills = require('./src/skills');

const app = express();
const PORT = process.env.PORT || 4001;
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
  console.log(`[HOTEL AGENT] Task ${task.id} created — skill: ${skillId}`);

  res.status(202).json(task);

  processTask(task.id, skillId, input).catch(err => {
    console.error(`[HOTEL AGENT] Task ${task.id} crashed:`, err.message);
    updateTaskStatus(task.id, 'failed', { error: err.message });
  });
});

async function processTask(taskId, skillId, input) {
  updateTaskStatus(taskId, 'working');
  console.log(`[HOTEL AGENT] Task ${taskId} → working`);

  let result;
  if (skillId === 'search_hotels') result = await skills.searchHotels(input);
  else if (skillId === 'book_hotel') result = await skills.bookHotel(input);
  else throw new Error(`No handler for skill: ${skillId}`);

  if (result.error) {
    updateTaskStatus(taskId, 'failed', { error: result.error });
  } else {
    updateTaskStatus(taskId, 'completed', { result });
    console.log(`[HOTEL AGENT] Task ${taskId} → completed`);
  }
}

// ── 3. STATUS CHECK ──────────────────────────────────────────────
app.get('/tasks/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.get('/health', (_req, res) => res.json({ status: 'ok', agent: agentCard.name }));

app.listen(PORT, () => {
  console.log(`[HOTEL AGENT] Running at http://localhost:${PORT}`);
  console.log(`[HOTEL AGENT] Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
});
