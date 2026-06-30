// agentCard.js — the A2A discovery manifest
//
// This is the A2A equivalent of MCP's tool definitions — except it
// describes an entire AGENT, not a single tool.
//
// Any other agent fetches this from:
//   GET /.well-known/agent.json
//
// and immediately knows: what this agent does, what skills it has,
// and how to talk to it. This is the "discovery" step from the A2A spec.

const agentCard = {
  // Standard A2A fields
  name: 'hotel-agent',
  description: 'Books hotels. Searches availability, compares price and rating, and confirms reservations.',
  url: process.env.HOTEL_AGENT_URL || 'http://localhost:4001',
  version: '1.0.0',

  // How callers should talk to this agent
  capabilities: {
    streaming: false,          // does it support streaming responses?
    pushNotifications: false,  // can it notify the caller when a task finishes?
  },

  // What this agent can be authenticated with
  authentication: {
    schemes: ['none'], // demo only — production would use 'bearer' or 'oauth2'
  },

  // The actual skills this agent exposes.
  // This is what the Flight Agent reads to decide WHEN to call the Hotel Agent.
  skills: [
    {
      id: 'search_hotels',
      name: 'Search hotels',
      description: 'Find available hotels near a location for given check-in/check-out dates.',
      inputModes: ['application/json'],
      outputModes: ['application/json'],
      examples: [
        'Find hotels near LHR airport for March 15-17',
        'Search 4-star hotels in central London under $200/night',
      ],
    },
    {
      id: 'book_hotel',
      name: 'Book hotel',
      description: 'Reserve a specific hotel room. Returns a booking confirmation.',
      inputModes: ['application/json'],
      outputModes: ['application/json'],
      examples: [
        'Book the Hilton London Heathrow for March 15-17 for John Doe',
      ],
    },
  ],
};

module.exports = agentCard;
