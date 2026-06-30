// agent.js — the orchestrator's LLM loop
//
// Compare this to flight-agent/src/agent.js from lesson 06: that file
// merged MCP tools AND A2A skills because Flight Agent was both a
// specialist (talks to Joy Air via MCP) and a caller (talks to Hotel
// Agent via A2A). The orchestrator is ONLY a caller — it holds no MCP
// client at all. dispatch() is now a single line because there's only
// one capability source.

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const config = require('./config');
const a2aClient = require('./a2aClient');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function dispatch(name, input) {
  // Every capability the orchestrator has comes from a discovered sub-agent —
  // there is no MCP fallback, so this is a direct call, not a branch.
  return a2aClient.callAgent(name, input.input ?? input);
}

async function runOrchestrator(userTask) {
  console.log('\n[ORCHESTRATOR] Task:', userTask);

  const tools = a2aClient.getAllAgentSkills();
  console.log(`[ORCHESTRATOR] Available skills: ${tools.map(t => t.name).join(', ') || '(none discovered)'}`);

  if (tools.length === 0) {
    return 'No sub-agents are currently reachable. Try POST /admin/rediscover once they are online.';
  }

  const messages = [{ role: 'user', content: userTask }];
  let iteration = 0;

  while (iteration < config.maxIterations) {
    iteration++;

    const response = await client.messages.create({
      model: config.model,
      system: config.systemPrompt,
      tools,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    });

    if (response.stop_reason === 'end_turn') {
      return response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        console.log(`[ORCHESTRATOR] Routing: ${block.name}`, block.input);
        const result = await dispatch(block.name, block.input);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }
  }

  throw new Error('Orchestrator exceeded max iterations');
}

module.exports = { runOrchestrator };
