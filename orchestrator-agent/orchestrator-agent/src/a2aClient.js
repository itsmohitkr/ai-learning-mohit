// a2aClient.js — discovers and calls every registered sub-agent
//
// This is the same discovery + send/poll pattern from the a2a-flygpt
// lesson's a2aClient.js — the wire protocol hasn't changed. What's new
// here is RESILIENT discovery: instead of crashing if a sub-agent isn't
// up yet, each agent gets retried with backoff, and the orchestrator
// boots with whatever's available rather than refusing to start.
//
// This directly fixes the "boot-order coupling" problem from lesson 06,
// where Flight Agent exited immediately if Hotel Agent wasn't reachable.

const axios = require('axios');

const registry = new Map();

// ── 1. Discover a single remote agent ────────────────────────
async function discoverAgent(name, baseUrl) {
  const { data: card } = await axios.get(`${baseUrl}/.well-known/agent.json`, {
    timeout: 3000,
  });
  registry.set(name, { url: baseUrl, card });
  console.log(`[A2A] Found "${card.name}" — skills: ${card.skills.map(s => s.id).join(', ')}`);
  return card;
}

// ── 2. Discover all configured agents, with retry + backoff per agent ──
// Each agent gets up to `retries` attempts with linearly increasing delay.
// If an agent never comes online, the orchestrator logs a warning and
// continues WITHOUT it — degraded capability, not a crashed process.
async function discoverAllAgents(agentConfig, { retries = 3, delayMs = 1000 } = {}) {
  for (const def of agentConfig.agents) {
    let attempt = 0;
    let discovered = false;

    while (attempt < retries && !discovered) {
      try {
        await discoverAgent(def.name, def.url);
        discovered = true;
      } catch (err) {
        attempt++;
        if (attempt >= retries) {
          console.warn(
            `[ORCHESTRATOR] Could not reach "${def.name}" at ${def.url} after ${retries} attempts — ` +
            `continuing without it. It can be discovered later via /admin/rediscover.`
          );
        } else {
          const backoff = delayMs * attempt;
          console.log(`[A2A] "${def.name}" not ready yet, retrying in ${backoff}ms...`);
          await new Promise(r => setTimeout(r, backoff));
        }
      }
    }
  }

  console.log(`[A2A] Discovery complete. ${registry.size}/${agentConfig.agents.length} agent(s) online.`);
}

// ── 3. Re-attempt discovery for agents that failed at startup ────────────
// Exposed so the orchestrator can offer a manual /admin/rediscover route
// without restarting the whole process.
async function rediscoverMissing(agentConfig) {
  const missing = agentConfig.agents.filter(def => !registry.has(def.name));
  for (const def of missing) {
    try {
      await discoverAgent(def.name, def.url);
    } catch {
      // still down — leave it out of the registry, no crash
    }
  }
  return Array.from(registry.keys());
}

// ── 4. Build a flat skill list for the LLM ───────────────────────
// Identical shape to lesson 06 — every sub-agent's skills are prefixed
// with the agent's name so dispatch() can route by prefix.
function getAllAgentSkills() {
  const all = [];
  for (const [agentName, { card }] of registry) {
    for (const skill of card.skills) {
      all.push({
        name: `${agentName}__${skill.id}`,
        description: `[${agentName}] ${skill.description}`,
        input_schema: {
          type: 'object',
          properties: { input: { type: 'object', description: `Input for ${skill.name}` } },
          required: ['input'],
        },
      });
    }
  }
  return all;
}

// ── 5. Send a task and poll until it completes ─────────────────────
async function callAgent(prefixedSkillName, input, { pollIntervalMs = 500, timeoutMs = 30000 } = {}) {
  const [agentName, ...rest] = prefixedSkillName.split('__');
  const skillId = rest.join('__');

  const entry = registry.get(agentName);
  if (!entry) return { error: `Unknown or unreachable agent: ${agentName}` };

  try {
    const { data: task } = await axios.post(`${entry.url}/tasks/send`, { skillId, input });
    console.log(`[A2A] Task ${task.id} sent to ${agentName} (${skillId}) — status: ${task.status}`);

    const startTime = Date.now();
    let current = task;

    while (current.status === 'submitted' || current.status === 'working') {
      if (Date.now() - startTime > timeoutMs) {
        return { error: `Task ${task.id} timed out after ${timeoutMs}ms` };
      }
      await new Promise(r => setTimeout(r, pollIntervalMs));

      const { data: polled } = await axios.get(`${entry.url}/tasks/${task.id}`);
      current = polled;
      console.log(`[A2A] Task ${task.id} status: ${current.status}`);
    }

    if (current.status === 'completed') return current.result;
    return { error: current.error || `Task failed with status: ${current.status}` };

  } catch (err) {
    const message = err.response?.data?.error || err.message;
    return { error: `A2A call to ${agentName} failed: ${message}` };
  }
}

function isKnownAgent(name) {
  return registry.has(name);
}

function listKnownAgents() {
  return Array.from(registry.entries()).map(([name, { url, card }]) => ({
    name, url, skills: card.skills.map(s => s.id),
  }));
}

module.exports = {
  discoverAllAgents,
  rediscoverMissing,
  getAllAgentSkills,
  callAgent,
  isKnownAgent,
  listKnownAgents,
};
