// a2aClient.js — the A2A client
//
// The exact counterpart to mcpClient.js, except instead of discovering and
// calling TOOLS, it discovers and calls entire AGENTS. Same prefixing
// pattern too: `hotel-agent__search_hotels` tells the dispatcher which
// agent to route to, just like `joyair__search_flights` told the MCP
// dispatcher which server to use.

const axios = require('axios');

const registry = new Map();

// ── 1. Discover a remote agent ────────────────────────────────────────
// Fetches the Agent Card from /.well-known/agent.json
async function discoverAgent(name, baseUrl) {
  console.log(`[A2A] Discovering agent "${name}" at ${baseUrl}`);
  const { data: card } = await axios.get(`${baseUrl}/.well-known/agent.json`);
  console.log(`[A2A] Found "${card.name}" — skills: ${card.skills.map(s => s.id).join(', ')}`);
  registry.set(name, { url: baseUrl, card });
  return card;
}

// ── 2. Discover all configured agents at startup ─────────────────────
async function discoverAllAgents(agentConfig) {
  for (const def of agentConfig.agents) {
    await discoverAgent(def.name, def.url);
  }
  console.log(`[A2A] All agents discovered. Total: ${registry.size}`);
}

// ── 3. Build a flat skill list for the LLM ────────────────────────────
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

// ── 4. Send a task and poll until it completes ─────────────────────────
// "Send and poll" — the standard way to handle work that may take longer
// than a single HTTP request should block for.
async function callAgent(prefixedSkillName, input, { pollIntervalMs = 500, timeoutMs = 30000 } = {}) {
  const [agentName, ...rest] = prefixedSkillName.split('__');
  const skillId = rest.join('__');

  const entry = registry.get(agentName);
  if (!entry) return { error: `Unknown agent: ${agentName}` };

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

module.exports = { discoverAllAgents, getAllAgentSkills, callAgent, isKnownAgent };
