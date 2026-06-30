// agentCard.js — unchanged from a2a-flygpt/hotel-agent/src/agentCard.js
// Hotel Agent was already a pure specialist in lesson 06 — it never
// called anyone. Copied here unmodified so this lesson is self-contained.

const agentCard = {
  name: 'hotel-agent',
  description: 'Books hotels. Searches availability, compares price and rating, and confirms reservations.',
  url: process.env.HOTEL_AGENT_URL || 'http://localhost:4001',
  version: '2.0.0',

  capabilities: {
    streaming: false,
    pushNotifications: false,
  },

  authentication: {
    schemes: ['none'],
  },

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
