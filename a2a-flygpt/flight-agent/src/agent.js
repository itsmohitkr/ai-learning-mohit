// agent.js — merging MCP and A2A in one loop
//
// This is the key file that ties everything together. The agent loop's
// structure is unchanged from every previous lesson — the new idea is that
// getAllCapabilities() merges TWO sources into one list, and dispatch()
// routes based on which source a call came from.

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const config = require('./config');
const mcpClient = require('./mcpClient');
const a2aClient = require('./a2aClient');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Merge MCP tools + A2A skills into one list for the LLM
function getAllCapabilities() {
  return [
    ...mcpClient.getAllTools(),       // joyair__search_flights, joyair__book_flight
    ...a2aClient.getAllAgentSkills(), // hotel-agent__search_hotels, hotel-agent__book_hotel
  ];
}

// Route a tool_use call to MCP or A2A based on its prefix
async function dispatch(name, input) {
  const [prefix] = name.split('__');

  if (a2aClient.isKnownAgent(prefix)) {
    // A2A skills expect a single `input` object — unwrap it from the LLM's call
    return a2aClient.callAgent(name, input.input ?? input);
  }
  return mcpClient.callTool(name, input);
}

async function runAgent(userTask) {
  console.log('\n[FLIGHT AGENT] Task:', userTask);

  const tools = getAllCapabilities();
  console.log(`[FLIGHT AGENT] Capabilities: ${tools.map(t => t.name).join(', ')}`);

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

        console.log(`[FLIGHT AGENT] Dispatching: ${block.name}`, block.input);
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

  throw new Error('Flight Agent exceeded max iterations');
}

module.exports = { runAgent, getAllCapabilities };
