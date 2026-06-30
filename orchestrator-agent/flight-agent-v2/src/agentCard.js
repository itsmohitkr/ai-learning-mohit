// agentCard.js — the A2A discovery manifest for Flight Agent
//
// This file did not exist in lesson 06's flight-agent/ — Flight Agent
// used to be a CALLER (it discovered Hotel Agent) but was never itself
// DISCOVERABLE. Now it's symmetric with Hotel Agent: any orchestrator
// can find it at GET /.well-known/agent.json, exactly the same shape
// Hotel Agent already exposed.

const agentCard = {
  name: 'flight-agent',
  description: 'Books flights. Searches Joy Air routes, compares price and duration, and confirms bookings.',
  url: process.env.FLIGHT_AGENT_URL || 'http://localhost:4002',
  version: '2.0.0',

  capabilities: {
    streaming: false,
    pushNotifications: false,
  },

  authentication: {
    schemes: ['none'], // demo only — production would use 'bearer' or 'oauth2'
  },

  // The actual skills this agent exposes.
  // This is what an orchestrator reads to decide WHEN to call Flight Agent.
  skills: [
    {
      id: 'search_flights',
      name: 'Search flights',
      description: 'Find Joy Air flights between two airports on a given date.',
      inputModes: ['application/json'],
      outputModes: ['application/json'],
      examples: [
        'Find flights from BOM to LHR on 2024-03-15',
        'Search Joy Air routes from Delhi to London',
      ],
    },
    {
      id: 'book_flight',
      name: 'Book flight',
      description: 'Book a specific Joy Air flight by flight number. Returns a booking confirmation.',
      inputModes: ['application/json'],
      outputModes: ['application/json'],
      examples: [
        'Book flight JA101 for John Doe',
      ],
    },
  ],
};

module.exports = agentCard;
