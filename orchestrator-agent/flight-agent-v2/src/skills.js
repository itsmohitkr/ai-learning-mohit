// skills.js — the actual work, backed by the Joy Air MCP server
//
// This is the composition point: A2A (how the orchestrator reaches this
// agent) and MCP (how this agent reaches Joy Air) meet here. From the
// orchestrator's point of view this is just "a skill that returns a
// result" — it has no idea Joy Air or MCP exist underneath.

const mcpClient = require('./mcpClient');

async function searchFlights({ from, to, date }) {
  const result = await mcpClient.callTool('joyair_search_flights', { from, to, date });
  // MCP tool results come back as { content: [{ type: 'text', text: '...' }] }
  const text = result.content?.[0]?.text;
  return text ? JSON.parse(text) : { error: 'No response from Joy Air MCP server' };
}

async function bookFlight({ flight_number, passenger_name }) {
  const result = await mcpClient.callTool('joyair_book_flight', { flight_number, passenger_name });
  const text = result.content?.[0]?.text;
  return text ? JSON.parse(text) : { error: 'No response from Joy Air MCP server' };
}

module.exports = { searchFlights, bookFlight };
